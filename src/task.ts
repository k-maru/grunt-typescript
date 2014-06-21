///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/typescript.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="./io.ts" />
///<reference path="./opts.ts" />
///<reference path="./runner.ts" />

module GruntTs{

    var Q = require('q');

    class SourceFile {
        //TODO: Extend(append lastMod, append Property)
        constructor(public scriptSnapshot: TypeScript.IScriptSnapshot, public byteOrderMark: TypeScript.ByteOrderMark, public lastMod:Date = new Date(0)) {
        }
    }

    export class Task implements TypeScript.IReferenceResolverHost{
        private compilationSettings: TypeScript.ImmutableCompilationSettings;
        private inputFiles: string[];
        private fileNameToSourceFile = new TypeScript.StringHashTable<SourceFile>();
        private hasErrors: boolean = false;
        private resolvedFiles: TypeScript.IResolvedFile[] = [];
        private logger: TypeScript.ILogger = null;
        //private destinationPath: string;
        private options: GruntTs.Opts;
        private outputFiles: string[] = [];

        private compiler: any;

        constructor(private grunt: any, private tscBinPath: string, private ioHost: GruntTs.GruntIO) {

        }

        start(options: GruntTs.Opts): Q.IPromise<any> {
            this.options = options;
            this.compilationSettings = options.createCompilationSettings();
            this.logger = new TypeScript.NullLogger();

            return Q.promise((resolve: (val: any) => void, reject: (val: any) => void, notify: (val: any) => void) => {

                if(!this.options.watch){
                    try{
                        this.exec();
                        resolve(true);
                    }catch(e){
                        reject(e);
                    }

                }else{
                    this.startWatch(resolve, reject);
                }
            });
        }

        exec(){
            var start = Date.now();

            this.inputFiles = this.options.expandedFiles();
            this.outputFiles = [];
            this.resolve();
            this.compile();

            this.writeResult(Date.now() - start);

        }

        startWatch(resolve: (val: any) => void, reject: (val: any) => void){
            if(!this.options.watch){
                resolve(true);
                return;
            }
            var watchPath = this.ioHost.resolvePath(this.options.watch.path),
                chokidar: any = require("chokidar"),
                watcher: any,
                targetPaths: {[key:string]: string;} = {},
                registerEvents = () => {
                    watcher = chokidar.watch(watchPath, { ignoreInitial: true, persistent: true });
                    watcher.on("add", (path: string) => {
                        handleEvent(path, "Added");
                    }).on("change", (path: string) => {
                        handleEvent(path, "Changed");
                    }).on("unlink", (path: string) =>{
                        handleEvent(path, "Unlinked");
                    }).on("error", (error: string) => {
                        this.ioHost.stdout.WriteLine("Error".red + ": " + error);
                    });
                },
                timeoutId: number,
                executeBuild = (files?: string[]) => {
                    return GruntTs.runTask(this.grunt, this.options.watch.before).then(() => {
                        try{
                            this.exec();
                        }catch(e){
                            //失敗した場合は次回のコンパイル対象にする
                            if(!files){
                                this.fileNameToSourceFile.map((key: string, value: SourceFile, ctx: any) => {
                                    value.lastMod = new Date(0);
                                }, null);
                            }else{
                                files.forEach((fileName) => {
                                    var sourceFile = this.getSourceFile(fileName);
                                    if(sourceFile){
                                        sourceFile.lastMod = new Date(0);
                                    }
                                })
                            }
                            throw e;
                        }

                        return  GruntTs.runTask(this.grunt, this.options.watch.after);
                    });
                },
                handleEvent = (path: string, eventName: string) => {
                    path = this.ioHost.normalizePath(path);
                    if(targetPaths[path]){
                        targetPaths[path] = eventName
                        return;
                    }
                    targetPaths[path] = eventName;
                    if(timeoutId){
                        clearTimeout(timeoutId);
                    }
                    timeoutId = setTimeout(() => {
                        var keys = Object.keys(targetPaths).filter((key) => {
                            var result = !!/\.ts$/.test(key),
                                eventName = targetPaths[key];
                            if(result){
                                this.ioHost.stdout.WriteLine(targetPaths[key].cyan + " " + key);
                                this.fileNameToSourceFile.remove(key);
                                if(eventName === "Unlinked" && this.compiler){
                                    this.compiler.removeFile(key);
                                }
                            }
                            return result;
                        });
                        targetPaths = {};
                        if(!keys.length) return;
                        executeBuild(keys).fin(() => {
                            this.writeWatchingMessage(watchPath);
                            timeoutId = 0;
                        });
                    }, 300);
                };

            if(this.options.watch.atBegin){
                executeBuild().fin(() => {
                    this.writeWatchingMessage(watchPath);
                    registerEvents();
                });
            }else{
                this.writeWatchingMessage(watchPath);
                registerEvents();
            }
        }

        private writeWatchingMessage(watchPath: string): void{
            //TODO: grunt mesod
            console.log("");
            console.log("Watching directory.... " + watchPath);
        }

        private resolve(): void{
            var resolvedFiles: TypeScript.IResolvedFile[] = [];
            var includeDefaultLibrary =  !this.compilationSettings.noLib();

            if(!this.options.noResolve) {

                var resolutionResults = TypeScript.ReferenceResolver.resolve(this.inputFiles, this, this.compilationSettings.useCaseSensitiveFileResolution());
                resolvedFiles = resolutionResults.resolvedFiles;

                includeDefaultLibrary = !this.compilationSettings.noLib() && !resolutionResults.seenNoDefaultLibTag;

                resolutionResults.diagnostics.forEach(d => this.addDiagnostic(d));
            } else {
                for (var i = 0, n = this.inputFiles.length; i < n; i++) {
                    var inputFile: string = this.inputFiles[i];
                    var referencedFiles: string[] = [];
                    var importedFiles: string[] = [];

                    // If declaration files are going to be emitted, preprocess the file contents and add in referenced files as well
                    if (this.compilationSettings.generateDeclarationFiles()) {
                        var references = TypeScript.getReferencedFiles(inputFile, this.getScriptSnapshot(inputFile));
                        for (var j = 0; j < references.length; j++) {
                            referencedFiles.push(references[j].path);
                        }

                        inputFile = this.resolvePath(inputFile);
                    }

                    resolvedFiles.push({
                        path: inputFile,
                        referencedFiles: referencedFiles,
                        importedFiles: importedFiles
                    });
                }
            }

            if (includeDefaultLibrary) {
                var libraryResolvedFile: TypeScript.IResolvedFile = {
                    path: this.ioHost.combine(this.tscBinPath, "lib.d.ts"),
                    referencedFiles: [],
                    importedFiles: []
                };

                // Prepend the library to the resolved list
                resolvedFiles = [libraryResolvedFile].concat(resolvedFiles);
            }

            this.resolvedFiles = resolvedFiles;
        }

        private compile(): void{

            if(!this.compiler) {
                var g = require("./modules/compiler");
                //var compiler = new TypeScript.TypeScriptCompiler(this.logger, this.compilationSettings);
                this.compiler = new g.Compiler(this.logger, this.compilationSettings);
            }

            var emitTargets: string[] = [];

            this.resolvedFiles.forEach(resolvedFile => {
                var sourceFile = this.getSourceFile(resolvedFile.path),
                    lastMod: Date,
                    isEmitTarget: boolean;

                //TODO: change
                if(this.ioHost.fileExists(resolvedFile.path)){
                    lastMod = this.ioHost.getLastMod(resolvedFile.path);
                    isEmitTarget = lastMod > sourceFile.lastMod;

                    if (isEmitTarget) {
                        emitTargets.push(resolvedFile.path);
                        sourceFile.lastMod = lastMod;
                    }
                }

                if (!this.compiler.getDocument(resolvedFile.path)) {
                    this.compiler.addFile(resolvedFile.path, sourceFile.scriptSnapshot, sourceFile.byteOrderMark, /*version:*/ 0, /*isOpen:*/ false, resolvedFile.referencedFiles);
                } else {
                    if (isEmitTarget) {
                        this.compiler.updateFile(resolvedFile.path, sourceFile.scriptSnapshot, /*version*/ 0, /*isOpen*/ false, /*textChangeRange*/ null);
                    }
                }
            });

            var ignoreError = this.options.ignoreError,
                hasOutputFile = false;

            //TODO: change
            for (var it = this.compiler.compileEmitTargets(emitTargets, this.ioHost.combine(this.tscBinPath, "lib.d.ts"),
                (path: string) => this.resolvePath(path)); it.moveNext();) {
            //for (var it = compiler.compile((path: string) => this.resolvePath(path)); it.moveNext();) {
                var result: TypeScript.CompileResult = it.current(),
                    hasError = false;

                result.diagnostics.forEach(d  => {
                    var info: TypeScript.DiagnosticInfo = d.info();
                    if (info.category === TypeScript.DiagnosticCategory.Error) {
                        hasError = true;
                    }
                    this.addDiagnostic(d);
                });
                if(hasError && !ignoreError){
                    throw new Error();
                }

                hasOutputFile = !!result.outputFiles.length || hasOutputFile;
                if (!this.tryWriteOutputFiles(result.outputFiles)) {
                    throw new Error();
                }
            }
            if(hasError && !hasOutputFile){
                throw new Error();
            }
        }

        private writeResult(ms: number){
            var result:  {js: string[]; m: string[]; d: string[]; other: string[];} = {js: [], m: [], d: [], other: []},
                resultMessage: string,
                pluralizeFile = (n: number) => (n + " file") + ((n === 1) ? "" : "s");
            this.outputFiles.forEach(function (item: string) {
                if (/\.js$/.test(item)) result.js.push(item);
                else if (/\.js\.map$/.test(item)) result.m.push(item);
                else if (/\.d\.ts$/.test(item)) result.d.push(item);
                else result.other.push(item);
            });

            resultMessage = "js: " + pluralizeFile(result.js.length)
                + ", map: " + pluralizeFile(result.m.length)
                + ", declaration: " + pluralizeFile(result.d.length)
                + " (" + ms + "ms)";
            if (this.options.outputOne) {
                if(result.js.length > 0){
                    this.grunt.log.writeln("File " + (result.js[0])["cyan"] + " created.");
                }
                this.grunt.log.writeln(resultMessage);
            } else {
                this.grunt.log.writeln(pluralizeFile(this.outputFiles.length)["cyan"] + " created. " + resultMessage);
            }
        }

        getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
            return this.getSourceFile(fileName).scriptSnapshot;
        }

        private getSourceFile(fileName: string): SourceFile {
            var sourceFile: SourceFile = this.fileNameToSourceFile.lookup(fileName);

            if (!sourceFile) {
                // Attempt to read the file
                var fileInformation: TypeScript.FileInformation;

                try {
                    fileInformation = this.ioHost.readFile(fileName, this.compilationSettings.codepage());
                }
                catch (e) {
                    fileInformation = new TypeScript.FileInformation("", TypeScript.ByteOrderMark.None);
                }

                var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation.contents);
                sourceFile = new SourceFile(snapshot, fileInformation.byteOrderMark);
                this.fileNameToSourceFile.add(fileName, sourceFile);
            }

            return sourceFile;
        }

        resolveRelativePath(path: string, directory: string): string {
            var unQuotedPath = TypeScript.stripStartAndEndQuotes(path);
            var normalizedPath: string;

            if (TypeScript.isRooted(unQuotedPath) || !directory) {
                normalizedPath = unQuotedPath;
            } else {
                normalizedPath = this.ioHost.combine(directory, unQuotedPath);
            }
            normalizedPath = this.resolvePath(normalizedPath);
            normalizedPath = TypeScript.switchToForwardSlashes(normalizedPath);
            return normalizedPath;
        }

        private fileExistsCache = TypeScript.createIntrinsicsObject<boolean>();

        fileExists(path: string): boolean {
            var exists = this.fileExistsCache[path];
            if (exists === undefined) {
                exists = this.ioHost.fileExists(path);
                this.fileExistsCache[path] = exists;
            }
            return exists;
        }

        getParentDirectory(path: string): string {
            return this.ioHost.dirName(path);
        }

        private addDiagnostic(diagnostic: TypeScript.Diagnostic) {
            var diagnosticInfo = diagnostic.info();
            if (diagnosticInfo.category === TypeScript.DiagnosticCategory.Error) {
                this.hasErrors = true;
            }

            if (diagnostic.fileName()) {
                this.ioHost.stderr.Write(diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + "): ");
            }

            this.ioHost.stderr.WriteLine(diagnostic.message());
        }

        private tryWriteOutputFiles(outputFiles: TypeScript.OutputFile[]): boolean {
            for (var i = 0, n = outputFiles.length; i < n; i++) {
                var outputFile = outputFiles[i];

                try {
                    this.writeFile(outputFile.name, outputFile.text, outputFile.writeByteOrderMark);
                }
                catch (e) {
                    this.addDiagnostic(
                        new TypeScript.Diagnostic(outputFile.name, null, 0, 0, TypeScript.DiagnosticCode.Emit_Error_0, [e.message]));
                    return false;
                }
            }

            return true;
        }

        writeFile(fileName: string, contents: string, writeByteOrderMark: boolean): void {

            var preparedFileName = this.prepareFileName(fileName);
            var path = this.ioHost.resolvePath(preparedFileName);
            var dirName = this.ioHost.dirName(path);
            this.createDirectoryStructure(dirName);

            contents = this.prepareSourcePath(fileName, preparedFileName, contents);

            this.ioHost.writeFile(path, contents, writeByteOrderMark);

            this.outputFiles.push(path);
        }

        private prepareFileName(fileName: string): string{
            var newFileName = fileName,
                basePath = this.options.basePath;

            if(this.options.outputOne){
                return newFileName;
            }
            if(!this.options.destinationPath){
                return newFileName;
            }

            var currentPath = this.ioHost.currentPath(),
                relativePath = this.ioHost.relativePath(currentPath, fileName);

            if(basePath){
                if(relativePath.substr(0, basePath.length) !== basePath){
                    throw new Error(fileName + " is not started base_path");
                }
                relativePath = relativePath.substr(basePath.length);
            }

            return this.ioHost.resolveMulti(currentPath, this.options.destinationPath, relativePath);
        }

        private prepareSourcePath(sourceFileName: string, preparedFileName: string, contents: string): string{
            var io = this.ioHost;
            if(this.options.outputOne){
                return contents;
            }
            if(sourceFileName === preparedFileName){
                return contents;
            }
            if(!this.options.destinationPath){
                return contents;
            }
            if(!(/\.js\.map$/.test(sourceFileName))){
                return contents;
            }
            var mapData: any = JSON.parse(contents),
                source = mapData.sources[0];
            mapData.sources.length = 0;
            var relative = io.relativePath(io.dirName(preparedFileName), sourceFileName);
            mapData.sources.push(io.combine(io.dirName(relative), source));
            return JSON.stringify(mapData);
        }

        private createDirectoryStructure(dirName: string): void {
            if (this.ioHost.directoryExists(dirName)) {
                return;
            }

            var parentDirectory = this.ioHost.dirName(dirName);
            if (parentDirectory != "") {
                this.createDirectoryStructure(parentDirectory);
            }
            this.ioHost.createDirectory(dirName);
        }

        directoryExists(path: string): boolean {
            return this.ioHost.directoryExists(path);;
        }

        private resolvePathCache = TypeScript.createIntrinsicsObject<string>();

        resolvePath(path: string): string {
            var cachedValue = this.resolvePathCache[path];
            if (!cachedValue) {
                cachedValue = this.ioHost.resolvePath(path);
                this.resolvePathCache[path] = cachedValue;
            }
            return cachedValue;
        }
    }
}