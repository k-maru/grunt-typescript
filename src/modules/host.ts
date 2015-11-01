///<reference path="../../typings/typescript.d.ts" />
///<reference path="../../typings/node.d.ts" />
///<reference path="../../typings/grunt.d.ts" />
///<reference path="./util.ts" />
///<reference path="../../typings/bluebird.d.ts" />
///<reference path="./task.ts" />

import * as ts from "typescript";
import * as gts from "./task";
import * as util from "./util";
import * as option from "./option";

let _path: NodeJS.Path = require("path"),
	_fs: NodeJS.FileSystem = require("fs"),
	_os: NodeJS.OS = require("os"),
    existingDirectories: ts.Map<boolean> = {};



function createSourceFile(fileName: string, text: string, languageVersion: ts.ScriptTarget): gts.SourceFile{
    if(text !== undefined){
        let result = <gts.SourceFile>ts.createSourceFile(fileName, text, languageVersion);
        result.mtime = _fs.statSync(fileName).mtime.getTime();
        return result;
    }
}

function directoryExists(directoryPath: string): boolean {
    if (util.hasProperty(existingDirectories, directoryPath)) {
        return true;
    }
    //TODO:
    if (util.directoryExists(directoryPath)) {
        existingDirectories[directoryPath] = true;
        return true;
    }
    return false;
}

function ensureDirectoriesExist(directoryPath: string) {
    if (directoryPath.length > util.getRootLength(directoryPath) && !directoryExists(directoryPath)) {
        let parentDirectory = util.getDirectoryPath(directoryPath);
        ensureDirectoriesExist(parentDirectory);
        //TODO:
        util.createDirectory(directoryPath);
    }
}

function prepareOutputDir(fileName: string, options: gts.CompilerOptions): string{
    if(options.singleFile || !options.dest){
        return fileName;
    }

    var currentPath = util.getCurrentDirectory(),
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

function prepareSourcePath(sourceFileName: string, preparedFileName: string, contents: string, options: gts.CompilerOptions): string{
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

function getNewLineChar(options: gts.CompilerOptions): string{
    let optValue = options.tsOptions.newLine;
    if(optValue === ts.NewLineKind.CarriageReturnLineFeed) {
        return "\r\n";
    } else if(optValue === ts.NewLineKind.LineFeed) {
        return "\n";
    }
    return _os.EOL;
}

export function createHost(grunt: IGrunt, options: gts.CompilerOptions, logger: gts.Logger): gts.CompilerHost{

    let platform: string = _os.platform(),
        // win32\win64 are case insensitive platforms, MacOS (darwin) by default is also case insensitive
        useCaseSensitiveFileNames: boolean = platform !== "win32" && platform !== "win64" && platform !== "darwin",
        sourceFileCache: {[key: string]: gts.SourceFile} = {},
        newSourceFiles: string[] = [],
        outputFiles: string[] = [];
     
    function getCanonicalFileName(fileName: string): string {
        // if underlying system can distinguish between two files whose names differs only in cases then file name already in canonical form.
        // otherwise use toLowerCase as a canonical form.
        return useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
    }

	function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): gts.SourceFile {
        
        logger.verbose("--host.getSourceFile: " + fileName);
        
        let fullName = util.abs(fileName),
            text = "";

        if(fullName in sourceFileCache){
            let chechedSourceFile = sourceFileCache[fullName],
                newMtime = _fs.statSync(fullName).mtime.getTime();
            
            if(chechedSourceFile.mtime !== newMtime){
                delete sourceFileCache[fullName];
            }else{
                logger.verbose("  cached");
                return sourceFileCache[fullName];
            }
        }
        
        if(!util.dirOrFileExists(fileName)){
            return;
        }
        
        try {
            text = util.readFile(fileName, options.tsOptions.charset);
        }
        catch (e) {
            if (onError) {
                onError(e.message);
            }
            text = "";
        }

        let result = createSourceFile(fileName, text, languageVersion);

        if(result){
            logger.verbose("  readed");
            sourceFileCache[fullName] = result;
//            if(!options.singleFile && options.watch && !options.tsOptions.noEmit){
//                newSourceFiles.push(fullName);    
//            }   
        }
        return result;
    }
    
    function writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void) {
        
        logger.verbose("--host.writeFile: " + fileName);

        let fullName = util.abs(fileName);

//        if(!options.singleFile && options.watch && !options.tsOptions.noEmit && newSourceFiles.length){
//            return;
//        }

        //watch の時に新しいファイルだけ出力をしたいが、判定できないためコメントアウト
//        if(!options.singleFile){
//            let tsFile = fullName.replace(/\.js\.map$/, ".ts").replace(/\.js$/, ".ts");
//            if(!(tsFile in newSourceFiles)){
//                tsFile = fullName.replace(/\.d\.ts$/, ".ts");
//                if(!(tsFile in newSourceFiles)) {
//                    logger.verbose("  canceled");
//                    return;
//                }
//            }
//        }

        //出力先ディレクトリのパスに変換
        if(!!options.keepDirectoryHierarchy){
            try{
                let newFileName = prepareOutputDir(fileName, options);
                //map ファイルの参照先パスを変換
                let targetData = prepareSourcePath(fileName, newFileName, data, options);
                logger.verbose(`  change file path: ${fileName} -> ${newFileName}`);
                
                fileName = newFileName;
                data = targetData;
                fullName = util.abs(fileName);
            }catch(e){
                console.log(e);
            }
        }
        
        try {
            ensureDirectoriesExist(util.getDirectoryPath(util.normalizePath(fullName)));
            //TODO:
            util.writeFile(fullName, data, writeByteOrderMark);
            outputFiles.push(fullName);
            
            logger.verbose(`  write file: ${fullName}`);
        }
        catch (e) {
            if (onError) onError(e.message);
        }
    }

    function writeResult(ms: number): void{
        let result:  {js: string[]; m: string[]; d: string[]; other: string[];} = {js: [], m: [], d: [], other: []},
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
        if (util.isUndef(fileNames)) {
            sourceFileCache = {};
        }
        if (util.isArray(fileNames)) {
            fileNames.forEach((f) => {
                let fullName = util.abs(f);
                if (fullName in sourceFileCache) {
                    delete sourceFileCache[fullName];
                }
            });
        }

        outputFiles.length = 0;
        newSourceFiles = [];
    }

    let newLineChar = getNewLineChar(options);

	return {
        getSourceFile,
        getDefaultLibFileName: (options: ts.CompilerOptions) => {
            logger.verbose(`bin dir = ${util.getBinDir()}`);
            return util.combinePaths(util.getBinDir(), options.target === ts.ScriptTarget.ES6 ? "lib.es6.d.ts" : "lib.d.ts");
        },
        writeFile,
        getCurrentDirectory: () => util.getCurrentDirectory(),
        useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
        getCanonicalFileName,
        getNewLine: () => newLineChar,
        fileExists: path => util.fileExists(path),
        readFile: fileName => util.readFile(fileName),
        writeResult,
        reset
    };
}