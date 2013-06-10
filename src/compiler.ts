///<reference path="./tsc.d.ts" />
///<reference path="./io.ts" />

module GruntTs{
    declare var require: any;
    var _path = require("path");

    class SourceFile {
        private _scriptSnapshot: TypeScript.IScriptSnapshot;
        private _byteOrderMark: ByteOrderMark;

        constructor(scriptSnapshot: TypeScript.IScriptSnapshot, byteOrderMark: ByteOrderMark) {
            this._scriptSnapshot = scriptSnapshot;
            this._byteOrderMark = byteOrderMark;
        }

        public scriptSnapshot(): TypeScript.IScriptSnapshot {
            return this._scriptSnapshot;
        }

        public byteOrderMark(): ByteOrderMark {
            return this._byteOrderMark;
        }
    }

    export class Compiler{
        private inputFiles: string[] = [];
        private compilationSettings: TypeScript.CompilationSettings;
        private resolvedFiles: TypeScript.IResolvedFile[] = [];
        private inputFileNameToOutputFileName = new TypeScript.StringHashTable();
        private fileNameToSourceFile = new TypeScript.StringHashTable();
        private hasErrors: boolean = false;
        private logger = new TypeScript.NullLogger();
        private ioHost: GruntTs.GruntIO;

        constructor(private grunt: any, private libDPath: string) {
            this.compilationSettings = new TypeScript.CompilationSettings();
        }

        compile(files: string[], dest: string, options: any): boolean {
            var anySyntacticErrors = false,
                anySemanticErrors = false,
                compiler;
            this.inputFiles = files;

            this.ioHost = new GruntTs.GruntIO(this.grunt, dest, options.base_path, options.outputOne);
            this.buildSettings(options);
            if (options.outputOne) {
                dest = _path.resolve(this.ioHost.currentPath(), dest);
                this.compilationSettings.outputOption = dest;
            }

            this.resolve(!options.nolib);
            compiler = new TypeScript.TypeScriptCompiler(this.logger, this.compilationSettings, null);

            this.resolvedFiles.forEach((resolvedFile) => {
                var sourceFile = this.getSourceFile(resolvedFile.path);
                compiler.addSourceUnit(resolvedFile.path, sourceFile.scriptSnapshot(), sourceFile.byteOrderMark(), /*version:*/ 0, /*isOpen:*/ false, resolvedFile.referencedFiles);

                var syntacticDiagnostics = compiler.getSyntacticDiagnostics(resolvedFile.path);
                compiler.reportDiagnostics(syntacticDiagnostics, this);

                if (syntacticDiagnostics.length > 0) {
                    anySyntacticErrors = true;
                }
            });

            if(anySyntacticErrors){
                return false;
            }

            compiler.pullTypeCheck();
            var fileNames = compiler.fileNameToDocument.getAllKeys();

            for (var i = 0, n = fileNames.length; i < n; i++) {
                var fileName = fileNames[i];
                var semanticDiagnostics = compiler.getSemanticDiagnostics(fileName);
                if (semanticDiagnostics.length > 0) {
                    anySemanticErrors = true;
                    compiler.reportDiagnostics(semanticDiagnostics, this);
                }
            }

            var mapInputToOutput = (inputFile: string, outputFile: string): void => {
                this.inputFileNameToOutputFileName.addOrUpdate(inputFile, outputFile);
            };

            // TODO: if there are any emit diagnostics.  Don't proceed.
            var emitDiagnostics = compiler.emitAll(this, mapInputToOutput);
            compiler.reportDiagnostics(emitDiagnostics, this);
            if (emitDiagnostics.length > 0) {
                return false;
            }

            // Don't emit declarations if we have any semantic diagnostics.
            if (anySemanticErrors) {
                return false;
            }

            var emitDeclarationsDiagnostics = compiler.emitAllDeclarations();
            compiler.reportDiagnostics(emitDeclarationsDiagnostics, this);
            if (emitDeclarationsDiagnostics.length > 0) {
                return false;
            }

            if(!options.outputOne){
                this.prepareSourceMapPath(options, this.ioHost.getCreatedFiles());
            }

            return true;
        }

        addDiagnostic(diagnostic: TypeScript.IDiagnostic) {
            this.hasErrors = true;

            if (diagnostic.fileName()) {
                var scriptSnapshot = this.getScriptSnapshot(diagnostic.fileName());
                var lineMap = new TypeScript.LineMap(scriptSnapshot.getLineStartPositions(), scriptSnapshot.getLength());
                var lineCol = { line: -1, character: -1 };
                lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);

                this.ioHost.stderr.Write(diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character + 1) + "): ");
            }

            this.ioHost.stderr.WriteLine(diagnostic.message());
        }

        getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
            return this.getSourceFile(fileName).scriptSnapshot();
        }

        getParentDirectory(path: string): string{
            return this.ioHost.dirName(path);
        }

        resolveRelativePath(path: string, directory: string): string {
            var unQuotedPath = TypeScript.stripQuotes(path);
            var normalizedPath;

            if (TypeScript.isRooted(unQuotedPath) || !directory) {
                normalizedPath = unQuotedPath;
            } else {
                normalizedPath = this.ioHost.combine(directory, unQuotedPath);
            }

            normalizedPath = this.ioHost.resolvePath(normalizedPath);

            normalizedPath = TypeScript.switchToForwardSlashes(normalizedPath);

            return normalizedPath;
        }

        fileExists(path: string): boolean {
            return this.ioHost.fileExists(path);
        }

        directoryExists(path: string): boolean {
            return this.ioHost.directoryExists(path);
        }

        writeFile(fileName: string, contents: string, writeByteOrderMark: boolean): void {
            this.ioHost.writeFile(fileName, contents, writeByteOrderMark);
        }

        resolvePath(path: string): string {
            return this.ioHost.resolvePath(path);
        }

        private getSourceFile(fileName: string): SourceFile {
            var sourceFile = this.fileNameToSourceFile.lookup(fileName);
            if (!sourceFile) {
                // Attempt to read the file
                var fileInformation: FileInformation;

                try {
                    fileInformation = this.ioHost.readFile(fileName);
                }
                catch (e) {
                    this.addDiagnostic(new TypeScript.Diagnostic(null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file__0__1, [fileName, e.message]));
                    fileInformation = new FileInformation("", ByteOrderMark.None);
                }

                var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation.contents());
                var sourceFile = new SourceFile(snapshot, fileInformation.byteOrderMark());
                this.fileNameToSourceFile.add(fileName, sourceFile);
            }

            return sourceFile;
        }

        private resolve(useDefaultLib: boolean){
            var resolutionResults = TypeScript.ReferenceResolver.resolve(this.inputFiles, this, this.compilationSettings),
                resolvedFiles: TypeScript.IResolvedFile[] = resolutionResults.resolvedFiles,
                i: number = 0, l: number = resolutionResults.diagnostics.length;

            for(; i < l; i++){
                this.addDiagnostic(resolutionResults.diagnostics[i]);
            }
            if(useDefaultLib){
                resolvedFiles = [{
                    path: this.ioHost.combine(this.libDPath, "lib.d.ts"),
                    referencedFiles: [],
                    importedFiles: []
                }].concat(resolvedFiles);
            }
            this.resolvedFiles = resolvedFiles;
        }

        private prepareSourceMapPath(options: any, createdFiles: GruntTs.CreatedFile[]){

            //TODO: _path と ファイル読み書きは ioHost に移動

            var useFullPath = options.fullSourceMapPath;

            if(!options.sourcemap){
                return;
            }

            createdFiles.filter((item) => {
                return item.type === GruntTs.CodeType.Map || (useFullPath && item.type === GruntTs.CodeType.JS);
            }).forEach((item) => {
                var mapObj, lines, sourceMapLine;
                if(item.type === GruntTs.CodeType.Map){
                    mapObj = JSON.parse(this.grunt.file.read(item.dest));
                    mapObj.sources.length = 0;
                    mapObj.sources.push(_path.relative(_path.dirname(item.dest), item.source).replace(/\\/g, "/"));
                    if(useFullPath){
                        mapObj.file = "file:///" + (item.dest.substr(0, item.dest.length - 6) + "js").replace(/\\/g, "/");
                    }
                    this.grunt.file.write(item.dest, JSON.stringify(mapObj))
                }else if(useFullPath && item.type === GruntTs.CodeType.JS){
                    lines = this.grunt.file.read(item.dest).split(this.grunt.util.linefeed);
                    sourceMapLine = lines[lines.length - 2];
                    if(/^\/\/@ sourceMappingURL\=.+\.js\.map$/.test(sourceMapLine)){
                        lines[lines.length - 2] = "//@ sourceMappingURL=file:///" + item.dest.replace(/\\/g, "/") + ".map";
                        this.grunt.file.write(item.dest, lines.join(this.grunt.util.linefeed));
                    }
                }
            });
        }

        private buildSettings(options: any){
            var temp: string,
                setting = this.compilationSettings;

            if (options) {
                if (options.target) {
                    temp = options.target.toLowerCase();
                    if (temp === 'es3') {
                        setting.codeGenTarget = 0; //TypeScript.CodeGenTarget.ES3;
                    } else if (temp == 'es5') {
                        setting.codeGenTarget = 1; //TypeScript.CodeGenTarget.ES5;
                    }
                }
                if (options.module) {
                    temp = options.module.toLowerCase();
                    if (temp === 'commonjs' || temp === 'node') {
                        setting.moduleGenTarget = 0;
                    } else if (temp === 'amd') {
                        setting.moduleGenTarget = 1;
                    }
                }
                if (options.sourcemap) {
                    setting.mapSourceFiles = options.sourcemap;
                }
                if (options.outputOne && options.fullSourceMapPath) {
                    setting.emitFullSourceMapPath = options.fullSourceMapPath;
                }
                if (options.declaration) {
                    setting.generateDeclarationFiles = true;
                }
                if (options.outputOne && options.fullSourceMapPath) {
                    setting.emitFullSourceMapPath = options.fullSourceMapPath;
                }
                if (options.comments) {
                    setting.emitComments = true;
                }
                //0.9 disallowbool
                if(options.disallowbool){
                    setting.disallowBool = true;
                }
            }
        }
    }
}