///<reference path="./tsc.d.ts" />
///<reference path="./grunt.d.ts" />
var GruntTs;
(function (GruntTs) {
    (function (CodeType) {
        CodeType[CodeType["JS"] = 0] = "JS";
        CodeType[CodeType["Map"] = 1] = "Map";
        CodeType[CodeType["Declaration"] = 2] = "Declaration";
    })(GruntTs.CodeType || (GruntTs.CodeType = {}));
    var CodeType = GruntTs.CodeType;

    var _fs = require('fs');
    var _path = require('path');

    function writeError(str) {
        console.log('>> '.red + str.trim().replace(/\n/g, '\n>> '.red));
    }
    function writeInfo(str) {
        console.log('>> '.cyan + str.trim().replace(/\n/g, '\n>> '.cyan));
    }

    function currentPath() {
        return _path.resolve(".");
    }

    var GruntIO = (function () {
        function GruntIO(grunt, destPath, basePath, outputOne) {
            this.grunt = grunt;
            this.destPath = destPath;
            this.basePath = basePath;
            this.outputOne = outputOne;
            this._createdFiles = [];
            var self = this;
            this.stderr = {
                Write: function (str) {
                    return writeError(str);
                },
                WriteLine: function (str) {
                    return writeError(str);
                },
                Close: function () {
                }
            };
            this.stdout = {
                Write: function (str) {
                    return writeInfo(str);
                },
                WriteLine: function (str) {
                    return writeInfo(str);
                },
                Close: function () {
                }
            };
            this.arguments = process.argv.slice(2);
        }
        GruntIO.prototype.getCreatedFiles = function () {
            return this._createdFiles;
        };

        GruntIO.prototype.currentPath = function () {
            return currentPath();
        };

        GruntIO.prototype.resolvePath = function (path) {
            return _path.resolve(path);
        };

        GruntIO.prototype.readFile = function (file) {
            this.grunt.verbose.write('Reading ' + file + '...');
            try  {
                var buffer = _fs.readFileSync(file, 'utf8');
                switch (buffer[0]) {
                    case 0xFE:
                        if (buffer[1] === 0xFF) {
                            var i = 0;
                            while ((i + 1) < buffer.length) {
                                var temp = buffer[i];
                                buffer[i] = buffer[i + 1];
                                buffer[i + 1] = temp;
                                i += 2;
                            }
                            return new FileInformation(buffer.toString("ucs2", 2), 2);
                        }
                        break;
                    case 0xFF:
                        if (buffer[1] === 0xFE) {
                            return new FileInformation(buffer.toString("ucs2", 2), 3);
                        }
                        break;
                    case 0xEF:
                        if (buffer[1] === 0xBB) {
                            return new FileInformation(buffer.toString("utf8", 3), 1);
                        }
                }
                this.grunt.verbose.ok();
                return new FileInformation(buffer.toString("utf8", 0), 0);
            } catch (e) {
                this.grunt.verbose.fail("CAN'T READ");
                throw e;
            }
        };

        GruntIO.prototype.dirName = function (path) {
            var dirPath = _path.dirname(path);
            if (dirPath === path) {
                dirPath = null;
            }
            return dirPath;
        };

        GruntIO.prototype.writeFile = function (path, contents, writeByteOrderMark) {
            var created = (function () {
                var source, type;
                if (/\.js$/.test(path)) {
                    source = path.substr(0, path.length - 3) + ".ts";
                    type = CodeType.JS;
                } else if (/\.js\.map$/.test(path)) {
                    source = path.substr(0, path.length - 7) + ".ts";
                    type = CodeType.Map;
                } else if (/\.d\.ts$/.test(path)) {
                    source = path.substr(0, path.length - 5) + ".ts";
                    type = CodeType.Declaration;
                }
                if (this.outputOne) {
                    source = "";
                }
                return {
                    source: source,
                    type: type
                };
            })();
            if (contents.trim().length < 1) {
                return;
            }
            if (!this.outputOne) {
                var g = _path.join(currentPath(), this.basePath || "");
                path = path.substr(g.length);
                path = _path.join(currentPath(), this.destPath ? this.destPath.toString() : '', path);
            }
            if (writeByteOrderMark) {
                contents = '\uFEFF' + contents;
            }

            this.grunt.file.write(path, contents);
            created.dest = path;

            this._createdFiles.push(created);
        };

        GruntIO.prototype.findFile = function (rootPath, partialFilePath) {
            var path = rootPath + "/" + partialFilePath;

            while (true) {
                if (_fs.existsSync(path)) {
                    return { fileInformation: this.readFile(path), path: path };
                } else {
                    var parentPath = _path.resolve(rootPath, "..");

                    if (rootPath === parentPath) {
                        return null;
                    } else {
                        rootPath = parentPath;
                        path = _path.resolve(rootPath, partialFilePath);
                    }
                }
            }
        };

        GruntIO.prototype.directoryExists = function (path) {
            return _fs.existsSync(path) && _fs.lstatSync(path).isDirectory();
        };

        GruntIO.prototype.fileExists = function (path) {
            return _fs.existsSync(path);
        };

        GruntIO.prototype.combine = function (left, right) {
            return _path.join(left, right);
        };

        GruntIO.prototype.createDirectory = function (path) {
            if (!this.directoryExists(path)) {
                _fs.mkdirSync(path);
            }
        };

        GruntIO.prototype.print = function (str) {
            this.stdout.Write(str);
        };

        GruntIO.prototype.printLine = function (str) {
            this.stdout.WriteLine(str);
        };

        GruntIO.prototype.deleteFile = function (path) {
            //dummy
        };

        GruntIO.prototype.dir = function (path, re, options) {
            return null;
        };

        GruntIO.prototype.watchFile = function (fileName, callback) {
            return null;
        };

        GruntIO.prototype.run = function (source, fileName) {
            return;
        };

        GruntIO.prototype.getExecutingFilePath = function () {
            return null;
        };

        GruntIO.prototype.quit = function (exitCode) {
            return;
        };
        return GruntIO;
    })();
    GruntTs.GruntIO = GruntIO;
})(GruntTs || (GruntTs = {}));
///<reference path="./grunt.d.ts" />
///<reference path="./tsc.d.ts" />
///<reference path="./io.ts" />
var GruntTs;
(function (GruntTs) {
    var _path = require("path");

    function createCompilationSettings(options, dest, ioHost) {
        var settings = new TypeScript.CompilationSettings(), temp;

        if (options.outputOne) {
            dest = _path.resolve(ioHost.currentPath(), dest);
            settings.outFileOption = dest;
        }
        if (options.sourcemap || options.fullSourceMapPath) {
            settings.mapSourceFiles = true;
        }
        if (options.declaration) {
            settings.generateDeclarationFiles = true;
        }
        if (options.comments) {
            settings.removeComments = false;
        } else {
            settings.removeComments = true;
        }

        //default
        settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript3;
        if (options.target) {
            temp = options.target.toLowerCase();
            if (temp === 'es3') {
                settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript3;
            } else if (temp == 'es5') {
                settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
            }
        }

        //default
        settings.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
        if (options.module) {
            temp = options.module.toLowerCase();
            if (temp === 'commonjs' || temp === 'node') {
                settings.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
            } else if (temp === 'amd') {
                settings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;
            }
        }
        if (options.noImplicitAny) {
            settings.noImplicitAny = true;
        }
        if (options.allowbool) {
            settings.allowBool = true;
        }
        if (options.allowimportmodule) {
            settings.allowModuleKeywordInExternalModuleReference = true;
        }

        if (options.disallowAsi) {
            settings.allowAutomaticSemicolonInsertion = false;
        }

        return settings;
    }
    GruntTs.createCompilationSettings = createCompilationSettings;
})(GruntTs || (GruntTs = {}));
///<reference path="./grunt.d.ts" />
///<reference path="./tsc.d.ts" />
///<reference path="./io.ts" />
///<reference path="./setting.ts" />
var GruntTs;
(function (GruntTs) {
    var _path = require("path");
    var SourceFile = (function () {
        function SourceFile(scriptSnapshot, byteOrderMark) {
            this.scriptSnapshot = scriptSnapshot;
            this.byteOrderMark = byteOrderMark;
        }
        return SourceFile;
    })();

    var Compiler = (function () {
        function Compiler(grunt, tscBinPath, ioHost) {
            this.grunt = grunt;
            this.tscBinPath = tscBinPath;
            this.ioHost = ioHost;
            this.fileNameToSourceFile = new TypeScript.StringHashTable();
            this.hasErrors = false;
            this.resolvedFiles = [];
            this.inputFileNameToOutputFileName = new TypeScript.StringHashTable();
        }
        Compiler.prototype.compile = function (files, dest, options) {
            var _this = this;
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
                compiler.addSourceUnit(resolvedFile.path, sourceFile.scriptSnapshot, sourceFile.byteOrderMark, /*version:*/ 0, false, resolvedFile.referencedFiles);

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
                if (!options || Object.prototype.toString.call(options.ignoreTypeCheck) !== "[object Boolean]" || !options.ignoreTypeCheck) {
                    return false;
                }
            }

            var mapInputToOutput = function (inputFile, outputFile) {
                _this.inputFileNameToOutputFileName.addOrUpdate(inputFile, outputFile);
            };

            // TODO: if there are any emit diagnostics.  Don't proceed.
            var emitDiagnostics = compiler.emitAll(this, mapInputToOutput);
            compiler.reportDiagnostics(emitDiagnostics, this);
            if (emitDiagnostics.length > 0) {
                return false;
            }

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
        };

        Compiler.prototype.resolve = function (options) {
            var resolvedFiles = [];
            var resolutionResults = TypeScript.ReferenceResolver.resolve(this.inputFiles, this, this.compilationSettings);
            resolvedFiles = resolutionResults.resolvedFiles;

            for (var i = 0, n = resolutionResults.diagnostics.length; i < n; i++) {
                this.addDiagnostic(resolutionResults.diagnostics[i]);
            }

            if (!options.nolib) {
                var libraryResolvedFile = {
                    path: this.ioHost.combine(this.tscBinPath, "lib.d.ts"),
                    referencedFiles: [],
                    importedFiles: []
                };
                resolvedFiles = [libraryResolvedFile].concat(resolvedFiles);
            }

            this.resolvedFiles = resolvedFiles;
        };

        Compiler.prototype.prepareSourceMapPath = function (options, createdFiles) {
            var _this = this;
            var newLine = TypeScript.newLine();
            var useFullPath = options.fullSourceMapPath;

            if (!options.sourcemap) {
                return;
            }

            createdFiles.filter(function (item) {
                return item.type === GruntTs.CodeType.Map || (useFullPath && item.type === GruntTs.CodeType.JS);
            }).forEach(function (item) {
                var mapObj, lines, sourceMapLine;
                if (item.type === GruntTs.CodeType.Map) {
                    mapObj = JSON.parse(_this.grunt.file.read(item.dest));
                    if (!options.outputOne) {
                        mapObj.sources.length = 0;
                        mapObj.sources.push(_path.relative(_path.dirname(item.dest), item.source).replace(/\\/g, "/"));
                    }
                    if (useFullPath) {
                        mapObj.file = "file:///" + (item.dest.substr(0, item.dest.length - 6) + "js").replace(/\\/g, "/");
                    }
                    _this.grunt.file.write(item.dest, JSON.stringify(mapObj));
                } else if (useFullPath && item.type === GruntTs.CodeType.JS) {
                    lines = _this.grunt.file.read(item.dest).split(newLine);

                    //TODO: 現状ソースマップのパスの後ろに空行が1行入ってファイルの終端になっているため2で固定
                    //将来的に変わる可能性があるためバージョンアップに注意
                    sourceMapLine = lines[lines.length - 2];
                    if (/^\/\/# sourceMappingURL\=.+\.js\.map$/.test(sourceMapLine)) {
                        lines[lines.length - 2] = "//# sourceMappingURL=file:///" + item.dest.replace(/\\/g, "/") + ".map";
                        _this.grunt.file.write(item.dest, lines.join(newLine));
                    }
                }
            });
        };

        Compiler.prototype.writeResult = function (createdFiles, options) {
            var result = { js: [], m: [], d: [], other: [] }, resultMessage, pluralizeFile = function (n) {
                return (n + " file") + ((n === 1) ? "" : "s");
            };
            createdFiles.forEach(function (item) {
                if (item.type === GruntTs.CodeType.JS)
                    result.js.push(item.dest);
else if (item.type === GruntTs.CodeType.Map)
                    result.m.push(item.dest);
else if (item.type === GruntTs.CodeType.Declaration)
                    result.d.push(item.dest);
else
                    result.other.push(item.dest);
            });

            resultMessage = "js: " + pluralizeFile(result.js.length) + ", map: " + pluralizeFile(result.m.length) + ", declaration: " + pluralizeFile(result.d.length);
            if (options.outputOne) {
                if (result.js.length > 0) {
                    this.grunt.log.writeln("File " + (result.js[0])["cyan"] + " created.");
                }
                this.grunt.log.writeln(resultMessage);
            } else {
                this.grunt.log.writeln(pluralizeFile(createdFiles.length)["cyan"] + " created. " + resultMessage);
            }
        };

        /// IReferenceResolverHost methods
        Compiler.prototype.getScriptSnapshot = function (fileName) {
            return this.getSourceFile(fileName).scriptSnapshot;
        };

        Compiler.prototype.getSourceFile = function (fileName) {
            var sourceFile = this.fileNameToSourceFile.lookup(fileName);
            if (!sourceFile) {
                // Attempt to read the file
                var fileInformation;

                try  {
                    fileInformation = this.ioHost.readFile(fileName);
                } catch (e) {
                    //this.addDiagnostic(new Diagnostic(null, 0, 0, DiagnosticCode.Cannot_read_file_0_1, [fileName, e.message]));
                    fileInformation = new FileInformation("", ByteOrderMark.None);
                }

                var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation.contents);
                sourceFile = new SourceFile(snapshot, fileInformation.byteOrderMark);
                this.fileNameToSourceFile.add(fileName, sourceFile);
            }

            return sourceFile;
        };

        Compiler.prototype.resolveRelativePath = function (path, directory) {
            var unQuotedPath = TypeScript.stripQuotes(path);
            var normalizedPath;

            if (TypeScript.isRooted(unQuotedPath) || !directory) {
                normalizedPath = unQuotedPath;
            } else {
                normalizedPath = this.ioHost.combine(directory, unQuotedPath);
            }
            normalizedPath = this.resolvePath(normalizedPath);
            normalizedPath = TypeScript.switchToForwardSlashes(normalizedPath);
            return normalizedPath;
        };

        Compiler.prototype.fileExists = function (path) {
            return this.ioHost.fileExists(path);
        };

        Compiler.prototype.getParentDirectory = function (path) {
            return this.ioHost.dirName(path);
        };

        Compiler.prototype.addDiagnostic = function (diagnostic) {
            this.hasErrors = true;

            if (diagnostic.fileName()) {
                var scriptSnapshot = this.getScriptSnapshot(diagnostic.fileName());
                var lineMap = new TypeScript.LineMap(scriptSnapshot.getLineStartPositions(), scriptSnapshot.getLength());
                var lineCol = { line: -1, character: -1 };
                lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);

                this.ioHost.stderr.Write(diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character + 1) + "): ");
            }

            this.ioHost.stderr.WriteLine(diagnostic.message());
        };

        /// EmitterIOHost methods
        Compiler.prototype.writeFile = function (fileName, contents, writeByteOrderMark) {
            var path = this.ioHost.resolvePath(fileName);
            var dirName = this.ioHost.dirName(path);
            this.createDirectoryStructure(dirName);
            this.ioHost.writeFile(path, contents, writeByteOrderMark);
        };

        Compiler.prototype.createDirectoryStructure = function (dirName) {
            if (this.ioHost.directoryExists(dirName)) {
                return;
            }

            var parentDirectory = this.ioHost.dirName(dirName);
            if (parentDirectory != "") {
                this.createDirectoryStructure(parentDirectory);
            }
            this.ioHost.createDirectory(dirName);
        };

        Compiler.prototype.directoryExists = function (path) {
            return this.ioHost.directoryExists(path);
            ;
        };

        Compiler.prototype.resolvePath = function (path) {
            return this.ioHost.resolvePath(path);
        };
        return Compiler;
    })();
    GruntTs.Compiler = Compiler;
})(GruntTs || (GruntTs = {}));
module.exports = function (grunt) {
    var _path = require("path"), _vm = require('vm'), loadTypeScript = function () {
        var typeScriptBinPath = _path.dirname(require.resolve("typescript")), typeScriptPath = _path.resolve(typeScriptBinPath, "typescript.js"), code;

        if (!typeScriptBinPath) {
            grunt.fail.warn("typescript.js not found. please 'npm install typescript'.");
            return false;
        }

        code = grunt.file.read(typeScriptPath);
        _vm.runInThisContext(code, typeScriptPath);

        return typeScriptBinPath;
    };

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var self = this, typescriptBinPath = loadTypeScript(), hasError = false;

        this.files.forEach(function (file) {
            var dest = file.dest, options = self.options(), files = [];

            grunt.file.expand(file.src).forEach(function (file) {
                //                if (file.substr(-5) === ".d.ts") {
                //                    return;
                //                }
                files.push(file);
            });

            options.outputOne = !!dest && _path.extname(dest) === ".js";

            if (!(new GruntTs.Compiler(grunt, typescriptBinPath, new GruntTs.GruntIO(grunt, dest, options.base_path, options.outputOne))).compile(files, dest, options)) {
                hasError = true;
            }
        });
        if (hasError) {
            return false;
        }
        if (grunt.task.current.errorCount) {
            return false;
        }
    });
};
