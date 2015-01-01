///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/typescriptServices.d.ts" />

///<reference path="./util.ts" />
///<reference path="./io.ts" />
///<reference path="./watcher.ts" />

module GruntTs{

    var  _fs: any = require("fs"),
        _os:any = require("os"),
        _path: any = require("path"),
        existingDirectories: ts.Map<boolean> = {};


    export interface GruntHost extends ts.CompilerHost {
        writeResult(ms: number): void;
        reset(fileNames: string[]): void;
        io: GruntIO;
        //debug(value: any, format?: (value: any) => string): void;
    }

    interface GruntSourceFile extends ts.SourceFile{
        mtime: number;
    }

    function directoryExists(io: GruntIO, directoryPath: string): boolean {
        if (util.hasProperty(existingDirectories, directoryPath)) {
            return true;
        }
        //TODO:
        if (io.directoryExists(directoryPath)) {
            existingDirectories[directoryPath] = true;
            return true;
        }
        return false;
    }

    function ensureDirectoriesExist(io: GruntIO, directoryPath: string) {
        if (directoryPath.length > util.getRootLength(directoryPath) && !directoryExists(io, directoryPath)) {
            var parentDirectory = util.getDirectoryPath(directoryPath);
            ensureDirectoriesExist(io, parentDirectory);
            //TODO:
            io.createDirectory(directoryPath);
        }
    }

    function prepareOutputDir(fileName: string, options: GruntOptions,io: GruntIO): string{
        if(options.singleFile || !options.dest){
            return fileName;
        }

        var currentPath = io.currentPath(),
            relativePath = util.normalizePath(_path.relative(currentPath, fileName)),
            basePath = options.basePath;

        if(basePath){
            if(relativePath.substr(0, basePath.length) !== basePath){
                throw new Error(fileName + " is not started basePath");
            }
            relativePath = relativePath.substr(basePath.length);
        }
        return util.normalizePath(_path.resolve(currentPath, options.dest, relativePath));
    }

    function prepareSourcePath(sourceFileName: string, preparedFileName: string, contents: string, options: GruntOptions): string{
        if(options.singleFile || !options.dest){
            return contents;
        }
        if(sourceFileName === preparedFileName){
            return contents;
        }
        if(!(/\.js\.map$/.test(sourceFileName))){
            return contents;
        }
        var mapData: any = JSON.parse(contents),
            source = mapData.sources[0];
        mapData.sources.length = 0;
        var relative = _path.relative(_path.dirname(preparedFileName), sourceFileName);
        mapData.sources.push(util.normalizePath(_path.join(_path.dirname(relative), source)));
        return JSON.stringify(mapData);
    }


    export function createCompilerHost(options: GruntOptions, io: GruntIO): GruntHost {
        var platform: string = _os.platform(),
            // win32\win64 are case insensitive platforms, MacOS (darwin) by default is also case insensitive
            useCaseSensitiveFileNames: boolean = platform !== "win32" && platform !== "win64" && platform !== "darwin",
            outputFiles: string[] = [],
            sourceFileCache: {[key: string]: GruntSourceFile} = {},
            newSourceFiles: {[key: string]: GruntSourceFile} = {};

        function getCanonicalFileName(fileName: string): string {
            // if underlying system can distinguish between two files whose names differs only in cases then file name already in canonical form.
            // otherwise use toLowerCase as a canonical form.
            return useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }

        function createSourceFile(fileName: string, text: string, languageVersion: ts.ScriptTarget, version: string): GruntSourceFile{
            if(text !== undefined){
                var result = <GruntSourceFile>ts.createSourceFile(fileName, text, languageVersion, /*version:*/ "0");
                result.mtime = _fs.statSync(fileName).mtime.getTime();
                return result;
            }
        }

        function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
            io.verbose("--host.getSourceFile: " + fileName);

            var fullName = io.abs(fileName);

            if(fullName in sourceFileCache){
                var chechedSourceFile = sourceFileCache[fullName];
                var newMtime = _fs.statSync(fullName).mtime.getTime();
                if(chechedSourceFile.mtime !== newMtime){
                    delete sourceFileCache[fullName];
                }else{
                    io.verbose("  cache");
                    return sourceFileCache[fullName];
                }
            }
            try {
                var text = io.readFile(fileName, options.tsOpts.charset);
            }
            catch (e) {
                if (onError) {
                    onError(e.message);
                }
                text = "";
            }

            var result = createSourceFile(fileName, text, languageVersion, /*version:*/ "0");

            if(result){
                sourceFileCache[fullName] = result;
                newSourceFiles[fullName] = result;
            }
            io.verbose("  create");

            return result;
        }

        function writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void) {

            io.verbose("--host.writeFile: " + fileName);

            var fullName = io.abs(fileName);

            if(!options.singleFile){
                var tsFile = fullName.replace(/\.js\.map$/, ".ts").replace(/\.js$/, ".ts");
                if(!(tsFile in newSourceFiles)){
                    tsFile = fullName.replace(/\.d\.ts$/, ".ts");
                    if(!(tsFile in newSourceFiles)) {

                        io.verbose("  cancel");

                        return;
                    }
                }
            }

            //出力先ディレクトリのパスに変換
            var newFileName = prepareOutputDir(fileName, options, io);
            //map ファイルの参照先パスを変換
            var targetData = prepareSourcePath(fileName, newFileName, data, options);

            try {
                ensureDirectoriesExist(io, util.getDirectoryPath(util.normalizePath(newFileName)));
                //TODO:
                io.writeFile(newFileName, targetData, writeByteOrderMark);
                outputFiles.push(newFileName);

                io.verbose("  write file: " + fileName + " => " + newFileName);
            }
            catch (e) {
                if (onError) onError(e.message);
            }
        }

        function writeResult(ms: number): void{
            var result:  {js: string[]; m: string[]; d: string[]; other: string[];} = {js: [], m: [], d: [], other: []},
                resultMessage: string,
                pluralizeFile = (n: number) => (n + " file") + ((n === 1) ? "" : "s");

            outputFiles.forEach(function (item: string) {
                if (/\.js$/.test(item)) result.js.push(item);
                else if (/\.js\.map$/.test(item)) result.m.push(item);
                else if (/\.d\.ts$/.test(item)) result.d.push(item);
                else result.other.push(item);
            });

            resultMessage = "js: " + pluralizeFile(result.js.length)
            + ", map: " + pluralizeFile(result.m.length)
            + ", declaration: " + pluralizeFile(result.d.length)
            + " (" + ms + "ms)";

            if (options.singleFile) {
                if(result.js.length > 0){
                    util.write("File " + (result.js[0])["cyan"] + " created.");
                }
                util.write(resultMessage);
            } else {
                util.write(pluralizeFile(outputFiles.length)["cyan"] + " created. " + resultMessage);
            }
        }

        function reset(fileNames: string[]): void {
            io.verbose("--host.reset");
            if (typeof fileNames === "undefined") {
                sourceFileCache = {};
            }
            if (util.isArray(fileNames)) {
                fileNames.forEach((f) => {
                    var fullName = io.abs(f);
                    io.verbose("  remove: " + fullName);

                    if (fullName in sourceFileCache) {
                        delete sourceFileCache[fullName];
                    }
                });
            }

            outputFiles.length = 0;
            newSourceFiles = {};
        }

        return {
            getSourceFile: getSourceFile,
            getDefaultLibFilename: (options: ts.CompilerOptions) => {
                return util.combinePaths(io.binPath(),
                    options.target === ts.ScriptTarget.ES6 ? "lib.es6.d.ts" : "lib.d.ts");
            },
            writeFile: writeFile,
            getCurrentDirectory: () => util.normalizePath(_path.resolve(".")),
            useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: () => _os.EOL,
            writeResult: writeResult,
            reset: reset,
            io: io
        };
    }
}
