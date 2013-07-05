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
        }
        GruntIO.prototype.getCreatedFiles = function () {
            return this._createdFiles;
        };

        GruntIO.prototype.currentPath = function () {
            return _path.resolve(".");
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
                var g = _path.join(this.currentPath(), this.basePath || "");
                path = path.substr(g.length);
                path = _path.join(this.currentPath(), this.destPath ? this.destPath.toString() : '', path);
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

        GruntIO.prototype.deleteFile = function (path) {
        };
        return GruntIO;
    })();
    GruntTs.GruntIO = GruntIO;
})(GruntTs || (GruntTs = {}));
var GruntTs;
(function (GruntTs) {
    var _path = require("path");

    var ErrorReporter = (function () {
        function ErrorReporter(ioHost, compilationEnvironment) {
            this.ioHost = ioHost;
            this.hasErrors = false;
            this.setCompilationEnvironment(compilationEnvironment);
        }
        ErrorReporter.prototype.addDiagnostic = function (diagnostic) {
            this.hasErrors = true;

            if (diagnostic.fileName()) {
                var soruceUnit = this.compilationEnvironment.getSourceUnit(diagnostic.fileName());
                if (!soruceUnit) {
                    soruceUnit = new TypeScript.SourceUnit(diagnostic.fileName(), this.ioHost.readFile(diagnostic.fileName()));
                }
                var lineMap = new TypeScript.LineMap(soruceUnit.getLineStartPositions(), soruceUnit.getLength());
                var lineCol = { line: -1, character: -1 };
                lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);

                this.ioHost.stderr.Write(diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character + 1) + "): ");
            }

            this.ioHost.stderr.WriteLine(diagnostic.message());
        };

        ErrorReporter.prototype.setCompilationEnvironment = function (compilationEnvironment) {
            this.compilationEnvironment = compilationEnvironment;
        };

        ErrorReporter.prototype.reset = function () {
            this.hasErrors = false;
        };
        return ErrorReporter;
    })();

    var CommandLineHost = (function () {
        function CommandLineHost(compilationSettings, errorReporter) {
            this.compilationSettings = compilationSettings;
            this.errorReporter = errorReporter;
            this.pathMap = {};
            this.resolvedPaths = {};
        }
        CommandLineHost.prototype.getPathIdentifier = function (path) {
            return this.compilationSettings.useCaseSensitiveFileResolution ? path : path.toLocaleUpperCase();
        };

        CommandLineHost.prototype.isResolved = function (path) {
            return this.resolvedPaths[this.getPathIdentifier(this.pathMap[path])] != undefined;
        };

        CommandLineHost.prototype.resolveCompilationEnvironment = function (preEnv, resolver, traceDependencies) {
            var _this = this;
            var resolvedEnv = new TypeScript.CompilationEnvironment(preEnv.compilationSettings, preEnv.ioHost);

            var nCode = preEnv.code.length;
            var path = "";

            this.errorReporter.setCompilationEnvironment(resolvedEnv);

            var resolutionDispatcher = {
                errorReporter: this.errorReporter,
                postResolution: function (path, code) {
                    var pathId = _this.getPathIdentifier(path);
                    if (!_this.resolvedPaths[pathId]) {
                        resolvedEnv.code.push(code);
                        _this.resolvedPaths[pathId] = true;
                    }
                }
            };

            for (var i = 0; i < nCode; i++) {
                path = TypeScript.switchToForwardSlashes(preEnv.ioHost.resolvePath(preEnv.code[i].path));
                this.pathMap[preEnv.code[i].path] = path;
                resolver.resolveCode(path, "", false, resolutionDispatcher);
            }

            return resolvedEnv;
        };
        return CommandLineHost;
    })();

    var Compiler = (function () {
        function Compiler(grunt, libDPath, ioHost) {
            this.grunt = grunt;
            this.libDPath = libDPath;
            this.ioHost = ioHost;
            this.resolvedEnvironment = null;
            this.errorReporter = null;
            this.compilationSettings = new TypeScript.CompilationSettings();
            this.compilationEnvironment = new TypeScript.CompilationEnvironment(this.compilationSettings, this.ioHost);
            this.errorReporter = new ErrorReporter(this.ioHost, this.compilationEnvironment);
        }
        Compiler.prototype.compile = function (files, dest, options) {
            var _this = this;
            var anySyntacticErrors = false, anySemanticErrors = false, compiler, self = this;

            this.buildSettings(options);

            if (options.outputOne) {
                dest = _path.resolve(this.ioHost.currentPath(), dest);
                this.compilationSettings.outputOption = dest;
            }

            if (!options.nolib) {
                this.compilationEnvironment.code.push(new TypeScript.SourceUnit(this.ioHost.combine(this.libDPath, "lib.d.ts"), null));
            }

            files.forEach(function (file) {
                _this.compilationEnvironment.code.push(new TypeScript.SourceUnit(file, null));
            });

            this.resolvedEnvironment = this.resolve();

            compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), this.compilationSettings, null);

            this.resolvedEnvironment.code.forEach(function (code) {
                code.fileInformation = _this.ioHost.readFile(code.path);
                if (_this.compilationSettings.generateDeclarationFiles) {
                    code.referencedFiles = TypeScript.getReferencedFiles(code.path, code);
                }
                compiler.addSourceUnit(code.path, TypeScript.ScriptSnapshot.fromString(code.fileInformation.contents()), code.fileInformation.byteOrderMark(), 0, false, code.referencedFiles);

                var syntacticDiagnostics = compiler.getSyntacticDiagnostics(code.path);
                compiler.reportDiagnostics(syntacticDiagnostics, _this.errorReporter);

                if (syntacticDiagnostics.length > 0) {
                    anySyntacticErrors = true;
                }
            });

            if (anySyntacticErrors) {
                return false;
            }

            compiler.pullTypeCheck();
            compiler.fileNameToDocument.getAllKeys().forEach(function (fileName) {
                var semanticDiagnostics = compiler.getSemanticDiagnostics(fileName);
                if (semanticDiagnostics.length > 0) {
                    anySemanticErrors = true;
                    compiler.reportDiagnostics(semanticDiagnostics, _this.errorReporter);
                }
            });

            var emitterIOHost = {
                writeFile: function (fileName, contents, writeByteOrderMark) {
                    var path = _this.ioHost.resolvePath(fileName);
                    return _this.ioHost.writeFile(path, contents, writeByteOrderMark);
                },
                directoryExists: this.ioHost.directoryExists,
                fileExists: this.ioHost.fileExists,
                resolvePath: this.ioHost.resolvePath
            };

            var mapInputToOutput = function (inputFile, outputFile) {
                _this.resolvedEnvironment.inputFileNameToOutputFileName.addOrUpdate(inputFile, outputFile);
            };

            var emitDiagnostics = compiler.emitAll(emitterIOHost, mapInputToOutput);
            compiler.reportDiagnostics(emitDiagnostics, this.errorReporter);
            if (emitDiagnostics.length > 0) {
                return false;
            }

            if (anySemanticErrors) {
                if (!options || Object.prototype.toString.call(options.ignoreTypeCheck) !== "[object Boolean]" || !options.ignoreTypeCheck) {
                    return false;
                }
            } else {
                var emitDeclarationsDiagnostics = compiler.emitAllDeclarations();
                compiler.reportDiagnostics(emitDeclarationsDiagnostics, this.errorReporter);
                if (emitDeclarationsDiagnostics.length > 0) {
                    return false;
                }
            }

            if (!options.outputOne) {
                this.prepareSourceMapPath(options, this.ioHost.getCreatedFiles());
            }

            this.writeResult(this.ioHost.getCreatedFiles(), options);

            return true;
        };

        Compiler.prototype.resolve = function () {
            var _this = this;
            var resolver = new TypeScript.CodeResolver(this.compilationEnvironment), commandLineHost = new CommandLineHost(this.compilationSettings, this.errorReporter), ret = commandLineHost.resolveCompilationEnvironment(this.compilationEnvironment, resolver, true);

            this.compilationEnvironment.code.forEach(function (code) {
                var path;
                if (!commandLineHost.isResolved(code.path)) {
                    path = code.path;
                    if (!TypeScript.isTSFile(path) && !TypeScript.isDTSFile(path)) {
                        _this.errorReporter.addDiagnostic(new TypeScript.Diagnostic(null, 0, 0, TypeScript.DiagnosticCode.Unknown_extension_for_file___0__Only__ts_and_d_ts_extensions_are_allowed, [path]));
                    } else {
                        _this.errorReporter.addDiagnostic(new TypeScript.Diagnostic(null, 0, 0, TypeScript.DiagnosticCode.Could_not_find_file___0_, [path]));
                    }
                }
            });

            return ret;
        };

        Compiler.prototype.prepareSourceMapPath = function (options, createdFiles) {
            var _this = this;
            var newLine = "\r\n";

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
                    mapObj.sources.length = 0;
                    mapObj.sources.push(_path.relative(_path.dirname(item.dest), item.source).replace(/\\/g, "/"));
                    if (useFullPath) {
                        mapObj.file = "file:///" + (item.dest.substr(0, item.dest.length - 6) + "js").replace(/\\/g, "/");
                    }
                    _this.grunt.file.write(item.dest, JSON.stringify(mapObj));
                } else if (useFullPath && item.type === GruntTs.CodeType.JS) {
                    lines = _this.grunt.file.read(item.dest).split(newLine);

                    sourceMapLine = lines[lines.length - 2];
                    if (/^\/\/@ sourceMappingURL\=.+\.js\.map$/.test(sourceMapLine)) {
                        lines[lines.length - 2] = "//@ sourceMappingURL=file:///" + item.dest.replace(/\\/g, "/") + ".map";
                        _this.grunt.file.write(item.dest, lines.join(newLine));
                    }
                }
            });
        };

        Compiler.prototype.buildSettings = function (options) {
            var temp, setting = this.compilationSettings;

            if (options) {
                if (options.target) {
                    temp = options.target.toLowerCase();
                    if (temp === 'es3') {
                        setting.codeGenTarget = 0;
                    } else if (temp == 'es5') {
                        setting.codeGenTarget = 1;
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

                if (options.disallowbool) {
                    setting.disallowBool = true;
                }

                if (options.disallowimportmodule) {
                    setting.allowModuleKeywordInExternalModuleReference = false;
                }
            }
        };

        Compiler.prototype.writeResult = function (createdFiles, options) {
            var result = { js: [], m: [], d: [], other: [] }, resultMessage, pluralizeFile = function (n) {
                return (n + " file") + ((n === 1) ? "" : "s");
            };
            createdFiles.forEach(function (item) {
                if (item.type === GruntTs.CodeType.JS)
                    result.js.push(item.dest); else if (item.type === GruntTs.CodeType.Map)
                    result.m.push(item.dest); else if (item.type === GruntTs.CodeType.Declaration)
                    result.d.push(item.dest); else
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
                if (file.substr(-5) === ".d.ts") {
                    return;
                }
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
