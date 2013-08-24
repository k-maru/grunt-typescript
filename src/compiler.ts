///<reference path="./grunt.d.ts" />
///<reference path="./tsc.d.ts" />
///<reference path="./io.ts" />
///<reference path="./setting.ts" />

module GruntTs{
    var _path: any = require("path");
    class SourceFile {
        constructor(public scriptSnapshot: TypeScript.IScriptSnapshot, public byteOrderMark: ByteOrderMark) {
        }
    }

    export class Compiler implements TypeScript.IReferenceResolverHost, TypeScript.IDiagnosticReporter, TypeScript.EmitterIOHost{
        private compilationSettings: TypeScript.CompilationSettings;
        private inputFiles: string[];
        private fileNameToSourceFile = new TypeScript.StringHashTable();
        private hasErrors: boolean = false;
        private resolvedFiles: TypeScript.IResolvedFile[] = [];
        private inputFileNameToOutputFileName = new TypeScript.StringHashTable();

        constructor(private grunt: any, private tscBinPath: string, private ioHost: GruntTs.GruntIO) {

        }

        compile(files: string[], dest: string, options: any): boolean {

            this.compilationSettings = GruntTs.createCompilationSettings(options, dest, this.ioHost);
            this.inputFiles = files;

            this.resolve(options);

            //compile
            var compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), this.compilationSettings);

            var anySyntacticErrors = false;
            var anySemanticErrors = false;

            for (var i = 0, n = this.resolvedFiles.length; i < n; i++) {
                var resolvedFile = this.resolvedFiles[i];
                var sourceFile = this.getSourceFile(resolvedFile.path);
                compiler.addSourceUnit(resolvedFile.path, sourceFile.scriptSnapshot, sourceFile.byteOrderMark, /*version:*/ 0, /*isOpen:*/ false, resolvedFile.referencedFiles);

                var syntacticDiagnostics = compiler.getSyntacticDiagnostics(resolvedFile.path);
                compiler.reportDiagnostics(syntacticDiagnostics, this);

                if (syntacticDiagnostics.length > 0) {
                    anySyntacticErrors = true;
                }
            }

            if (anySyntacticErrors) {
                return true;
            }

            compiler.pullTypeCheck();

            var fileNames = compiler.fileNameToDocument.getAllKeys();
            var n = fileNames.length;
            for (var i = 0; i < n; i++) {
                var fileName = fileNames[i];
                var semanticDiagnostics = compiler.getSemanticDiagnostics(fileName);
                if (semanticDiagnostics.length > 0) {
                    anySemanticErrors = true;
                    compiler.reportDiagnostics(semanticDiagnostics, this);
                }
            }
            if (anySemanticErrors) {
                if(!options || Object.prototype.toString.call(options.ignoreTypeCheck) !== "[object Boolean]" || !options.ignoreTypeCheck){
                    return false;
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
            if (!anySemanticErrors) {
                var emitDeclarationsDiagnostics = compiler.emitAllDeclarations();
                compiler.reportDiagnostics(emitDeclarationsDiagnostics, this);
                if (emitDeclarationsDiagnostics.length > 0) {
                    return false;
                }
            }

            this.prepareSourceMapPath(options, this.ioHost.getCreatedFiles());
            this.writeResult(this.ioHost.getCreatedFiles(), options);
            return true;
        }

        private resolve(options: any): void{
            var resolvedFiles: TypeScript.IResolvedFile[] = [];
            var resolutionResults = TypeScript.ReferenceResolver.resolve(this.inputFiles, this, this.compilationSettings);
            resolvedFiles = resolutionResults.resolvedFiles;

            for (var i = 0, n = resolutionResults.diagnostics.length; i < n; i++) {
                this.addDiagnostic(resolutionResults.diagnostics[i]);
            }

            if(!options.nolib){
                var libraryResolvedFile: TypeScript.IResolvedFile = {
                    path: this.ioHost.combine(this.tscBinPath, "lib.d.ts"),
                    referencedFiles: [],
                    importedFiles: []
                };
                resolvedFiles = [libraryResolvedFile].concat(resolvedFiles);
            }

            this.resolvedFiles = resolvedFiles;
        }

        private prepareSourceMapPath(options: any, createdFiles: GruntTs.CreatedFile[]): void{
            var newLine: string = TypeScript.newLine();
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
                    if(!options.outputOne){
                        mapObj.sources.length = 0;
                        mapObj.sources.push(_path.relative(_path.dirname(item.dest), item.source).replace(/\\/g, "/"));
                    }
                    if(useFullPath){
                        mapObj.file = "file:///" + (item.dest.substr(0, item.dest.length - 6) + "js").replace(/\\/g, "/");
                    }
                    this.grunt.file.write(item.dest, JSON.stringify(mapObj))
                }else if(useFullPath && item.type === GruntTs.CodeType.JS){
                    lines = this.grunt.file.read(item.dest).split(newLine);
                    //TODO: 現状ソースマップのパスの後ろに空行が1行入ってファイルの終端になっているため2で固定
                    //将来的に変わる可能性があるためバージョンアップに注意
                    sourceMapLine = lines[lines.length - 2];
                    if(/^\/\/# sourceMappingURL\=.+\.js\.map$/.test(sourceMapLine)){
                        lines[lines.length - 2] = "//# sourceMappingURL=file:///" + item.dest.replace(/\\/g, "/") + ".map";
                        this.grunt.file.write(item.dest, lines.join(newLine));
                    }
                }
            });
        }

        private writeResult(createdFiles: GruntTs.CreatedFile[], options: any){
            var result = {js:[], m:[], d:[], other:[]},
                resultMessage: string,
                pluralizeFile = (n) => (n + " file") + ((n === 1) ? "" : "s");
            createdFiles.forEach(function (item) {
                if (item.type === GruntTs.CodeType.JS) result.js.push(item.dest);
                else if (item.type === GruntTs.CodeType.Map) result.m.push(item.dest);
                else if (item.type === GruntTs.CodeType.Declaration) result.d.push(item.dest);
                else result.other.push(item.dest);
            });

            resultMessage = "js: " + pluralizeFile(result.js.length)
                + ", map: " + pluralizeFile(result.m.length)
                + ", declaration: " + pluralizeFile(result.d.length);
            if (options.outputOne) {
                if(result.js.length > 0){
                    this.grunt.log.writeln("File " + (result.js[0])["cyan"] + " created.");
                }
                this.grunt.log.writeln(resultMessage);
            } else {
                this.grunt.log.writeln(pluralizeFile(createdFiles.length)["cyan"] + " created. " + resultMessage);
            }
        }

        /// IReferenceResolverHost methods
        getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
            return this.getSourceFile(fileName).scriptSnapshot;
        }

        private getSourceFile(fileName: string): SourceFile {
            var sourceFile: SourceFile = this.fileNameToSourceFile.lookup(fileName);
            if (!sourceFile) {
                // Attempt to read the file
                var fileInformation: FileInformation;

                try {
                    fileInformation = this.ioHost.readFile(fileName);
                }
                catch (e) {
                    //this.addDiagnostic(new Diagnostic(null, 0, 0, DiagnosticCode.Cannot_read_file_0_1, [fileName, e.message]));
                    fileInformation = new FileInformation("", ByteOrderMark.None);
                }

                var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation.contents);
                sourceFile = new SourceFile(snapshot, fileInformation.byteOrderMark);
                this.fileNameToSourceFile.add(fileName, sourceFile);
            }

            return sourceFile;
        }

        resolveRelativePath(path: string, directory: string): string {
            var unQuotedPath = TypeScript.stripQuotes(path);
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

        fileExists(path: string): boolean {
            return this.ioHost.fileExists(path);
        }

        getParentDirectory(path: string): string {
            return this.ioHost.dirName(path);
        }

        addDiagnostic(diagnostic: TypeScript.Diagnostic) {
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

        /// EmitterIOHost methods
        writeFile(fileName: string, contents: string, writeByteOrderMark: boolean): void {
            var path = this.ioHost.resolvePath(fileName);
            var dirName = this.ioHost.dirName(path);
            this.createDirectoryStructure(dirName);
            this.ioHost.writeFile(path, contents, writeByteOrderMark);
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

        resolvePath(path: string): string {
            return this.ioHost.resolvePath(path);
        }
    }
}