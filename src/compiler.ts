///<reference path="./grunt.d.ts" />
///<reference path="./tsc.d.ts" />
///<reference path="./io.ts" />

module GruntTs{
    var _path = require("path");

    class ErrorReporter {
        private compilationEnvironment: TypeScript.CompilationEnvironment
        public hasErrors: boolean;

        constructor(public ioHost: GruntTs.GruntIO, compilationEnvironment: TypeScript.CompilationEnvironment) {
            this.hasErrors = false;
            this.setCompilationEnvironment(compilationEnvironment);
        }

        public addDiagnostic(diagnostic: TypeScript.IDiagnostic) {
            this.hasErrors = true;

            if (diagnostic.fileName()) {
                var soruceUnit = this.compilationEnvironment.getSourceUnit(diagnostic.fileName());
                if (!soruceUnit) {
                    soruceUnit = new TypeScript.SourceUnit(diagnostic.fileName(), this.ioHost.readFile(diagnostic.fileName()));
                }
                var lineMap = new TypeScript.LineMap(soruceUnit.getLineStartPositions(), soruceUnit.getLength());
                var lineCol = { line: -1, character: -1 };
                lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);

                this.ioHost.stderr.Write(diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character+1) + "): ");
            }

            this.ioHost.stderr.WriteLine(diagnostic.message());
        }

        public setCompilationEnvironment(compilationEnvironment: TypeScript.CompilationEnvironment): void {
            this.compilationEnvironment = compilationEnvironment;
        }

        public reset() {
            this.hasErrors = false;
        }
    }

    class CommandLineHost {

        public pathMap: any = {};
        public resolvedPaths: any = {};

        constructor(public compilationSettings: TypeScript.CompilationSettings, public errorReporter: ErrorReporter) {
        }

        public getPathIdentifier(path: string) {
            return this.compilationSettings.useCaseSensitiveFileResolution ? path : path.toLocaleUpperCase();
        }

        public isResolved(path: string) {
            return this.resolvedPaths[this.getPathIdentifier(this.pathMap[path])] != undefined;
        }

        public resolveCompilationEnvironment(preEnv: TypeScript.CompilationEnvironment,
                                             resolver: TypeScript.ICodeResolver,
                                             traceDependencies: boolean): TypeScript.CompilationEnvironment {
            var resolvedEnv = new TypeScript.CompilationEnvironment(preEnv.compilationSettings, preEnv.ioHost);

            var nCode = preEnv.code.length;
            var path = "";

            this.errorReporter.setCompilationEnvironment(resolvedEnv);

            var resolutionDispatcher: TypeScript.IResolutionDispatcher = {
                errorReporter: this.errorReporter,
                postResolution: (path: string, code: TypeScript.IScriptSnapshot) => {
                    var pathId = this.getPathIdentifier(path);
                    if (!this.resolvedPaths[pathId]) {
                        resolvedEnv.code.push(<TypeScript.SourceUnit>code);
                        this.resolvedPaths[pathId] = true;
                    }
                }
            };

            for (var i = 0; i < nCode; i++) {
                path = TypeScript.switchToForwardSlashes(preEnv.ioHost.resolvePath(preEnv.code[i].path));
                this.pathMap[preEnv.code[i].path] = path;
                resolver.resolveCode(path, "", false, resolutionDispatcher);
            }

            return resolvedEnv;
        }
    }


    export class Compiler{
        private compilationSettings: TypeScript.CompilationSettings;
        private compilationEnvironment: TypeScript.CompilationEnvironment;
        private resolvedEnvironment: TypeScript.CompilationEnvironment = null;
        private errorReporter: ErrorReporter = null;

        constructor(private grunt: any, private libDPath: string, private ioHost: GruntTs.GruntIO) {
            this.compilationSettings = new TypeScript.CompilationSettings();
            this.compilationEnvironment = new TypeScript.CompilationEnvironment(this.compilationSettings, this.ioHost);
            this.errorReporter = new ErrorReporter(this.ioHost, this.compilationEnvironment);
        }

        compile(files: string[], dest: string, options: any): boolean {
            var anySyntacticErrors = false,
                anySemanticErrors = false,
                compiler,
                self = this;

            this.buildSettings(options);

            if (options.outputOne) {
                dest = _path.resolve(this.ioHost.currentPath(), dest);
                this.compilationSettings.outputOption = dest;
            }

            if(!options.nolib){
                this.compilationEnvironment.code.push(
                    new TypeScript.SourceUnit(this.ioHost.combine(this.libDPath, "lib.d.ts"), null));
            }

            files.forEach((file) => {
                this.compilationEnvironment.code.push(new TypeScript.SourceUnit(file, null));
            });

            this.resolvedEnvironment = this.resolve();

            compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), this.compilationSettings, null);

            this.resolvedEnvironment.code.forEach((code) => {
                code.fileInformation = this.ioHost.readFile(code.path);
                if(this.compilationSettings.generateDeclarationFiles){
                    code.referencedFiles = TypeScript.getReferencedFiles(code.path, code);
                }
                compiler.addSourceUnit(code.path, TypeScript.ScriptSnapshot.fromString(code.fileInformation.contents()),
                    code.fileInformation.byteOrderMark(), /*version:*/ 0, /*isOpen:*/ false, code.referencedFiles);

                var syntacticDiagnostics = compiler.getSyntacticDiagnostics(code.path);
                compiler.reportDiagnostics(syntacticDiagnostics, this.errorReporter);

                if (syntacticDiagnostics.length > 0) {
                    anySyntacticErrors = true;
                }
            });

            if(anySyntacticErrors){
                return false;
            }

            compiler.pullTypeCheck();
            compiler.fileNameToDocument.getAllKeys().forEach((fileName) => {
                var semanticDiagnostics = compiler.getSemanticDiagnostics(fileName);
                if (semanticDiagnostics.length > 0) {
                    anySemanticErrors = true;
                    compiler.reportDiagnostics(semanticDiagnostics, this.errorReporter);
                }
            });

            var emitterIOHost = {
                writeFile: (fileName: string, contents: string, writeByteOrderMark: boolean) => {
                    var path = this.ioHost.resolvePath(fileName);
                    return this.ioHost.writeFile(path, contents, writeByteOrderMark);
                },
                directoryExists: this.ioHost.directoryExists,
                fileExists: this.ioHost.fileExists,
                resolvePath: this.ioHost.resolvePath
            };

            var mapInputToOutput = (inputFile: string, outputFile: string): void => {
                this.resolvedEnvironment.inputFileNameToOutputFileName.addOrUpdate(inputFile, outputFile);
            };

            // TODO: if there are any emit diagnostics.  Don't proceed.
            var emitDiagnostics = compiler.emitAll(emitterIOHost, mapInputToOutput);
            compiler.reportDiagnostics(emitDiagnostics, this.errorReporter);
            if (emitDiagnostics.length > 0) {
                return false;
            }

            // Don't emit declarations if we have any semantic diagnostics.
            if (anySemanticErrors) {
                if(!options || Object.prototype.toString.call(options.ignoreTypeCheck) !== "[object Boolean]" || !options.ignoreTypeCheck){
                    return false;
                }
            }else{
                var emitDeclarationsDiagnostics = compiler.emitAllDeclarations();
                compiler.reportDiagnostics(emitDeclarationsDiagnostics, this.errorReporter);
                if (emitDeclarationsDiagnostics.length > 0) {
                    return false;
                }
            }

            if(!options.outputOne){
                this.prepareSourceMapPath(options, this.ioHost.getCreatedFiles());
            }

            this.writeResult(this.ioHost.getCreatedFiles(), options);

            return true;
        }

        private resolve(){
            var resolver = new TypeScript.CodeResolver(this.compilationEnvironment),
                commandLineHost = new CommandLineHost(this.compilationSettings, this.errorReporter),
                ret = commandLineHost.resolveCompilationEnvironment(this.compilationEnvironment, resolver, true);

            this.compilationEnvironment.code.forEach((code) => {
                var path: string;
                if(!commandLineHost.isResolved(code.path)){
                   path = code.path;
                   if (!TypeScript.isTSFile(path) && !TypeScript.isDTSFile(path)) {
                       this.errorReporter.addDiagnostic(
                           new TypeScript.Diagnostic(null, 0, 0, TypeScript.DiagnosticCode.Unknown_extension_for_file___0__Only__ts_and_d_ts_extensions_are_allowed, [path]));
                   }
                   else {
                       this.errorReporter.addDiagnostic(
                           new TypeScript.Diagnostic(null, 0, 0, TypeScript.DiagnosticCode.Could_not_find_file___0_, [path]));
                   }
               }
            });

            return ret;
        }

        private prepareSourceMapPath(options: any, createdFiles: GruntTs.CreatedFile[]){
            //TODO: 現状改行はtsc内で\r\n固定。将来的に変わる可能性があるためバージョンアップに要注意
            var newLine: string = "\r\n";

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
                    lines = this.grunt.file.read(item.dest).split(newLine);
                    //TODO: 現状ソースマップのパスの後ろに空行が1行入ってファイルの終端になっているため2で固定
                    //将来的に変わる可能性があるためバージョンアップに注意
                    sourceMapLine = lines[lines.length - 2];
                    if(/^\/\/@ sourceMappingURL\=.+\.js\.map$/.test(sourceMapLine)){
                        lines[lines.length - 2] = "//@ sourceMappingURL=file:///" + item.dest.replace(/\\/g, "/") + ".map";
                        this.grunt.file.write(item.dest, lines.join(newLine));
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
    }
}