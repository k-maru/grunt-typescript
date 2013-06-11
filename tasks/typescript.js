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

    var GruntIO = (function () {
        function GruntIO(grunt, destPath, basePath, outputOne) {
            var _this = this;
            this.grunt = grunt;
            this.destPath = destPath;
            this.basePath = basePath;
            this.outputOne = outputOne;
            this._createdFiles = [];
            var self = this;
            this.stderr = {
                Write: function (str) {
                    return _this.grunt.log.error(str);
                },
                WriteLine: function (str) {
                    return self.grunt.log.error(str);
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
            var file = _path.join(rootPath, partialFilePath), fileInfo, parentPath;

            while (true) {
                if (_fs.existsSync(file)) {
                    try  {
                        fileInfo = this.readFile(file);
                        return {
                            content: fileInfo.contents(),
                            path: file
                        };
                    } catch (err) {
                    }
                } else {
                    parentPath = _path.resolve(rootPath, "..");
                    if (rootPath === parentPath) {
                        return null;
                    } else {
                        rootPath = parentPath;
                        file = _path.resolve(rootPath, partialFilePath);
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
        return GruntIO;
    })();
    GruntTs.GruntIO = GruntIO;
})(GruntTs || (GruntTs = {}));
var GruntTs;
(function (GruntTs) {
    var _path = require("path");

    var SourceFile = (function () {
        function SourceFile(scriptSnapshot, byteOrderMark) {
            this._scriptSnapshot = scriptSnapshot;
            this._byteOrderMark = byteOrderMark;
        }
        SourceFile.prototype.scriptSnapshot = function () {
            return this._scriptSnapshot;
        };

        SourceFile.prototype.byteOrderMark = function () {
            return this._byteOrderMark;
        };
        return SourceFile;
    })();

    var Compiler = (function () {
        function Compiler(grunt, libDPath) {
            this.grunt = grunt;
            this.libDPath = libDPath;
            this.inputFiles = [];
            this.resolvedFiles = [];
            this.inputFileNameToOutputFileName = new TypeScript.StringHashTable();
            this.fileNameToSourceFile = new TypeScript.StringHashTable();
            this.hasErrors = false;
            this.logger = new TypeScript.NullLogger();
            this.compilationSettings = new TypeScript.CompilationSettings();
        }
        Compiler.prototype.compile = function (files, dest, options) {
            var _this = this;
            var anySyntacticErrors = false, anySemanticErrors = false, compiler;
            this.inputFiles = files;

            this.ioHost = new GruntTs.GruntIO(this.grunt, dest, options.base_path, options.outputOne);
            this.buildSettings(options);
            if (options.outputOne) {
                dest = _path.resolve(this.ioHost.currentPath(), dest);
                this.compilationSettings.outputOption = dest;
            }

            this.resolve(!options.nolib);
            compiler = new TypeScript.TypeScriptCompiler(this.logger, this.compilationSettings, null);

            this.resolvedFiles.forEach(function (resolvedFile) {
                var sourceFile = _this.getSourceFile(resolvedFile.path);
                compiler.addSourceUnit(resolvedFile.path, sourceFile.scriptSnapshot(), sourceFile.byteOrderMark(), 0, false, resolvedFile.referencedFiles);

                var syntacticDiagnostics = compiler.getSyntacticDiagnostics(resolvedFile.path);
                compiler.reportDiagnostics(syntacticDiagnostics, _this);

                if (syntacticDiagnostics.length > 0) {
                    anySyntacticErrors = true;
                }
            });

            if (anySyntacticErrors) {
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

            var mapInputToOutput = function (inputFile, outputFile) {
                _this.inputFileNameToOutputFileName.addOrUpdate(inputFile, outputFile);
            };

            var emitDiagnostics = compiler.emitAll(this, mapInputToOutput);
            compiler.reportDiagnostics(emitDiagnostics, this);
            if (emitDiagnostics.length > 0) {
                return false;
            }

            if (anySemanticErrors) {
                return false;
            }

            var emitDeclarationsDiagnostics = compiler.emitAllDeclarations();
            compiler.reportDiagnostics(emitDeclarationsDiagnostics, this);
            if (emitDeclarationsDiagnostics.length > 0) {
                return false;
            }

            if (!options.outputOne) {
                this.prepareSourceMapPath(options, this.ioHost.getCreatedFiles());
            }

            this.writeResult(this.ioHost.getCreatedFiles(), options);

            return true;
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

        Compiler.prototype.getScriptSnapshot = function (fileName) {
            return this.getSourceFile(fileName).scriptSnapshot();
        };

        Compiler.prototype.getParentDirectory = function (path) {
            return this.ioHost.dirName(path);
        };

        Compiler.prototype.resolveRelativePath = function (path, directory) {
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
        };

        Compiler.prototype.fileExists = function (path) {
            return this.ioHost.fileExists(path);
        };

        Compiler.prototype.directoryExists = function (path) {
            return this.ioHost.directoryExists(path);
        };

        Compiler.prototype.writeFile = function (fileName, contents, writeByteOrderMark) {
            this.ioHost.writeFile(fileName, contents, writeByteOrderMark);
        };

        Compiler.prototype.resolvePath = function (path) {
            return this.ioHost.resolvePath(path);
        };

        Compiler.prototype.getSourceFile = function (fileName) {
            var sourceFile = this.fileNameToSourceFile.lookup(fileName);
            if (!sourceFile) {
                var fileInformation;

                try  {
                    fileInformation = this.ioHost.readFile(fileName);
                } catch (e) {
                    this.addDiagnostic(new TypeScript.Diagnostic(null, 0, 0, TypeScript.DiagnosticCode.Cannot_read_file__0__1, [fileName, e.message]));
                    fileInformation = new FileInformation("", ByteOrderMark.None);
                }

                var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation.contents());
                var sourceFile = new SourceFile(snapshot, fileInformation.byteOrderMark());
                this.fileNameToSourceFile.add(fileName, sourceFile);
            }

            return sourceFile;
        };

        Compiler.prototype.resolve = function (useDefaultLib) {
            var resolutionResults = TypeScript.ReferenceResolver.resolve(this.inputFiles, this, this.compilationSettings), resolvedFiles = resolutionResults.resolvedFiles, i = 0, l = resolutionResults.diagnostics.length;

            for (; i < l; i++) {
                this.addDiagnostic(resolutionResults.diagnostics[i]);
            }
            if (useDefaultLib) {
                resolvedFiles = [
                    {
                        path: this.ioHost.combine(this.libDPath, "lib.d.ts"),
                        referencedFiles: [],
                        importedFiles: []
                    }
                ].concat(resolvedFiles);
            }
            this.resolvedFiles = resolvedFiles;
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
            }
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
                    this.grunt.log.writeln("File " + (result.js[0]).cyan + " created.");
                }
                this.grunt.log.writeln(resultMessage);
            } else {
                this.grunt.log.writeln(pluralizeFile(createdFiles.length).cyan + " created. " + resultMessage);
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
        var self = this, typescriptBinPath = loadTypeScript();

        this.files.forEach(function (file) {
            var dest = file.dest, options = self.options(), files = [];

            grunt.file.expand(file.src).forEach(function (file) {
                if (file.substr(-5) === ".d.ts") {
                    return;
                }
                files.push(file);
            });

            options.outputOne = !!dest && _path.extname(dest) === ".js";

            (new GruntTs.Compiler(grunt, typescriptBinPath)).compile(files, dest, options);
        });

        if (grunt.task.current.errorCount) {
            return false;
        }
    });
};
