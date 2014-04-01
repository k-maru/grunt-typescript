///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/tsc/tsc.d.ts" />
var GruntTs;
(function (GruntTs) {
    var _fs = require('fs');
    var _path = require('path');
    var _os = require('os');

    function writeError(str) {
        console.log('>> '.red + str.trim().replace(/\n/g, '\n>> '.red));
    }
    function writeInfo(str) {
        console.log('>> '.cyan + str.trim().replace(/\n/g, '\n>> '.cyan));
    }

    function normalizePath(path) {
        if (Object.prototype.toString.call(path) === "[object String]") {
            return path.replace(/\\/g, "/");
        }
        return path;
    }

    var _currentPath = normalizePath(_path.resolve("."));

    function currentPath() {
        return _currentPath;
    }

    function readFile(file, codepage) {
        if (codepage !== null) {
            throw new Error(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.codepage_option_not_supported_on_current_platform, null));
        }

        var buffer = _fs.readFileSync(file);
        switch (buffer[0]) {
            case 0xFE:
                if (buffer[1] === 0xFF) {
                    // utf16-be. Reading the buffer as big endian is not supported, so convert it to
                    // Little Endian first
                    var i = 0;
                    while ((i + 1) < buffer.length) {
                        var temp = buffer[i];
                        buffer[i] = buffer[i + 1];
                        buffer[i + 1] = temp;
                        i += 2;
                    }
                    return new TypeScript.FileInformation(buffer.toString("ucs2", 2), 2 /* Utf16BigEndian */);
                }
                break;
            case 0xFF:
                if (buffer[1] === 0xFE) {
                    // utf16-le
                    return new TypeScript.FileInformation(buffer.toString("ucs2", 2), 3 /* Utf16LittleEndian */);
                }
                break;
            case 0xEF:
                if (buffer[1] === 0xBB) {
                    // utf-8
                    return new TypeScript.FileInformation(buffer.toString("utf8", 3), 1 /* Utf8 */);
                }
        }

        // Default behaviour
        return new TypeScript.FileInformation(buffer.toString("utf8", 0), 0 /* None */);
    }

    function writeFile(path, contents, writeByteOrderMark) {
        function mkdirRecursiveSync(path) {
            var stats = _fs.statSync(path);
            if (stats.isFile()) {
                throw "\"" + path + "\" exists but isn't a directory.";
            } else if (stats.isDirectory()) {
                return;
            } else {
                mkdirRecursiveSync(_path.dirname(path));
                _fs.mkdirSync(path, 509);
            }
        }
        mkdirRecursiveSync(_path.dirname(path));

        if (writeByteOrderMark) {
            contents = '\uFEFF' + contents;
        }

        var chunkLength = 4 * 1024;
        var fileDescriptor = _fs.openSync(path, "w");
        try  {
            for (var index = 0; index < contents.length; index += chunkLength) {
                var buffer = new Buffer(contents.substr(index, chunkLength), "utf8");

                _fs.writeSync(fileDescriptor, buffer, 0, buffer.length, null);
            }
        } finally {
            _fs.closeSync(fileDescriptor);
        }
    }

    var GruntIO = (function () {
        function GruntIO(grunt) {
            this.grunt = grunt;
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
            //original
            this.newLine = _os.EOL;
        }
        GruntIO.prototype.readFile = function (file, codepage) {
            var result;
            try  {
                this.grunt.verbose.write("Reading " + file + "...");
                result = readFile(file, codepage);
                this.grunt.verbose.writeln("OK".green);
                return result;
            } catch (e) {
                this.grunt.verbose.writeln("");
                this.grunt.verbose.fail("Can't read file. " + e.message);
                throw e;
            }
        };

        GruntIO.prototype.writeFile = function (path, contents, writeByteOrderMark) {
            try  {
                this.grunt.verbose.write("Writing " + path + "...");
                writeFile(path, contents, writeByteOrderMark);
                this.grunt.verbose.writeln("OK".green);
            } catch (e) {
                this.grunt.verbose.writeln("");
                this.grunt.verbose.fail("Can't write file. " + e.message);
                throw e;
            }
        };

        GruntIO.prototype.appendFile = function (path, content) {
            this.grunt.verbose.write("Append " + path + "...");
            _fs.appendFileSync(path, content);
        };

        GruntIO.prototype.deleteFile = function (path) {
            try  {
                this.grunt.verbose.write("Deleting " + path + "...");
                _fs.unlinkSync(path);
                this.grunt.verbose.writeln("OK".green);
            } catch (e) {
                this.grunt.verbose.writeln("");
                this.grunt.verbose.fail("Can't delete file. " + e.message);
                throw e;
            }
        };

        GruntIO.prototype.fileExists = function (path) {
            return _fs.existsSync(path);
        };

        GruntIO.prototype.dir = function (path, re, options) {
            var opts = options || {};

            function filesInFolder(folder) {
                var paths = [];

                try  {
                    var files = _fs.readdirSync(folder);
                    for (var i = 0; i < files.length; i++) {
                        var stat = _fs.statSync(folder + "/" + files[i]);
                        if (opts.recursive && stat.isDirectory()) {
                            paths = paths.concat(filesInFolder(folder + "/" + files[i]));
                        } else if (stat.isFile() && (!re || files[i].match(re))) {
                            paths.push(folder + "/" + files[i]);
                        }
                    }
                } catch (err) {
                }

                return paths;
            }

            return filesInFolder(path);
        };

        GruntIO.prototype.createDirectory = function (path) {
            if (!this.directoryExists(path)) {
                _fs.mkdirSync(path);
            }
        };

        GruntIO.prototype.directoryExists = function (path) {
            return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
        };

        GruntIO.prototype.resolvePath = function (path) {
            return _path.resolve(path);
        };

        GruntIO.prototype.dirName = function (path) {
            var dirPath = _path.dirname(path);

            // Node will just continue to repeat the root path, rather than return null
            if (dirPath === path) {
                dirPath = null;
            }

            return dirPath;
        };

        GruntIO.prototype.findFile = function (rootPath, partialFilePath) {
            var path = rootPath + "/" + partialFilePath;

            while (true) {
                if (_fs.existsSync(path)) {
                    return { fileInformation: this.readFile(path, null), path: path };
                } else {
                    var parentPath = _path.resolve(rootPath, "..");

                    // Node will just continue to repeat the root path, rather than return null
                    if (rootPath === parentPath) {
                        return null;
                    } else {
                        rootPath = parentPath;
                        path = _path.resolve(rootPath, partialFilePath);
                    }
                }
            }
        };

        GruntIO.prototype.print = function (str) {
            this.stdout.Write(str);
        };

        GruntIO.prototype.printLine = function (str) {
            this.stdout.WriteLine(str);
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

        //original method
        GruntIO.prototype.currentPath = function () {
            return currentPath();
        };

        //original method
        GruntIO.prototype.combine = function (left, right) {
            return normalizePath(_path.join(left, right));
        };

        //original
        GruntIO.prototype.relativePath = function (from, to) {
            return normalizePath(_path.relative(from, to));
        };

        //original
        GruntIO.prototype.resolveMulti = function () {
            var paths = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                paths[_i] = arguments[_i + 0];
            }
            return normalizePath(_path.resolve.apply(_path, paths));
        };

        //original
        GruntIO.prototype.writeWarn = function (message) {
            this.grunt.log.writeln(message.yellow);
        };

        GruntIO.prototype.normalizePath = function (path) {
            return normalizePath(path);
        };
        return GruntIO;
    })();
    GruntTs.GruntIO = GruntIO;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/tsc/tsc.d.ts" />
///<reference path="io.ts" />
var GruntTs;
(function (GruntTs) {
    var _path = require("path"), _fs = require("fs");

    function prepareNewLine(optVal) {
        var val;
        if (optVal) {
            val = optVal.toString().toUpperCase();
            return val === "CRLF" ? 0 /* crLf */ : val === "LF" ? 1 /* lf */ : 2 /* auto */;
        }
        return 2 /* auto */;
    }

    function prepareIndentStep(optVal) {
        if (Object.prototype.toString.call(optVal) === "[object Number]" && optVal > -1) {
            return optVal;
        }
        return -1;
    }

    function isStr(val) {
        return Object.prototype.toString.call(val) === "[object String]";
    }

    function isBool(val) {
        return Object.prototype.toString.call(val) === "[object Boolean]";
    }

    function prepareBasePath(opt, io) {
        var optVal = "";
        if (isStr(opt.base_path)) {
            io.writeWarn("The 'base_path' option will be obsoleted. Please use the 'basePath'.");
            optVal = opt.base_path;
        }
        if (isStr(opt.basePath)) {
            optVal = opt.basePath;
        }

        if (!optVal) {
            return undefined;
        }
        optVal = io.normalizePath(optVal);
        if (optVal.lastIndexOf("/") !== optVal.length - 1) {
            optVal = optVal + "/";
        }

        //TODO: ほんまにいるかチェック
        return io.normalizePath(optVal);
    }

    function prepareSourceMap(opt, io) {
        var optVal = false;
        if (opt.sourcemap) {
            io.writeWarn("The 'sourcemap' option will be obsoleted. Please use the 'sourceMap'. (different casing)");
            optVal = !!opt.sourcemap;
        }
        if (opt.sourceMap) {
            optVal = !!opt.sourceMap;
        }
        return optVal;
    }

    function prepareNoLib(opt, io) {
        var optVal = false;
        if (opt.nolib) {
            io.writeWarn("The 'nolib' option will be obsoleted. Please use the 'noLib'. (different casing)");
            optVal = !!opt.nolib;
        }
        if (opt.noLib) {
            optVal = !!opt.noLib;
        }
        return optVal;
    }

    function checkIgnoreTypeCheck(opt, io) {
        if (typeof opt.ignoreTypeCheck !== "undefined") {
            io.writeWarn("The 'ignoreTypeCheck' option removed. Please use the 'ignoreError'.");
        }
    }

    function prepareIgnoreError(optVal) {
        var val = false;
        if (typeof optVal !== "undefined") {
            val = !!optVal;
        }
        return val;
    }

    function prepareNoResolve(optVal) {
        var val = false;
        if (typeof optVal !== "undefined") {
            val = !!optVal;
        }
        return val;
    }

    function prepareTarget(optVal) {
        var val = undefined;
        if (optVal.target) {
            var temp = (optVal.target + "").toLowerCase();
            if (temp === 'es3') {
                val = 0 /* EcmaScript3 */;
            } else if (temp == 'es5') {
                val = 1 /* EcmaScript5 */;
            }
        }
        return val;
    }

    function prepareModule(optVal) {
        var val = undefined;
        if (optVal.module) {
            var temp = (optVal.module + "").toLowerCase();
            if (temp === 'commonjs' || temp === 'node') {
                val = 1 /* Synchronous */;
            } else if (temp === 'amd') {
                val = 2 /* Asynchronous */;
            }
        }
        return val;
    }

    function prepareWatch(optVal, files, io) {
        var result = undefined, getDirNames = function (files) {
            return files.map(function (file) {
                if (_fs.existsSync(file)) {
                    if (_fs.statSync(file).isDirectory()) {
                        return file;
                    }
                } else {
                    if (!_path.extname(file)) {
                        return file;
                    }
                }
                return io.normalizePath(io.resolvePath(_path.dirname(file)));
            });
        };
        if (!optVal) {
            return undefined;
        }
        if (isStr(optVal)) {
            return {
                path: (optVal + "")
            };
        }
        if (isBool(optVal) && !!optVal) {
            var dirNames = getDirNames(files), path = dirNames.reduce(function (prev, curr) {
                if (!prev) {
                    return curr;
                }
                var left = io.normalizePath(_path.relative(prev, curr)), right = io.normalizePath(_path.relative(curr, prev)), match = left.match(/^(\.\.(\/)?)+/);
                if (match) {
                    return io.normalizePath(_path.resolve(prev, match[0]));
                }
                match = right.match(/^(\.\.\/)+/);
                if (match) {
                    return io.normalizePath(_path.resolve(curr, match[0]));
                }
                return prev;
            }, undefined);
            return {
                path: path
            };
        }

        return {
            path: optVal.path
        };
    }

    (function (NewLine) {
        NewLine[NewLine["crLf"] = 0] = "crLf";
        NewLine[NewLine["lf"] = 1] = "lf";
        NewLine[NewLine["auto"] = 2] = "auto";
    })(GruntTs.NewLine || (GruntTs.NewLine = {}));
    var NewLine = GruntTs.NewLine;

    var Opts = (function () {
        function Opts(_source, grunt, gruntFile, _io) {
            this._source = _source;
            this.grunt = grunt;
            this.gruntFile = gruntFile;
            this._io = _io;
            this._source = _source || {};
            this.destinationPath = _io.normalizePath(gruntFile.dest);

            this.newLine = prepareNewLine(this._source.newLine);
            this.indentStep = prepareIndentStep(this._source.indentStep);
            this.useTabIndent = !!this._source.useTabIndent;
            this.basePath = prepareBasePath(this._source, this._io);
            this.outputOne = !!this.destinationPath && _path.extname(this.destinationPath) === ".js";
            this.noResolve = prepareNoResolve(this._source.noResolve);
            this.sourceMap = prepareSourceMap(this._source, this._io);
            this.noLib = prepareNoLib(this._source, this._io);
            this.declaration = !!this._source.declaration;
            this.removeComments = !this._source.comments;
            this.ignoreError = prepareIgnoreError(this._source.ignoreError);
            this.langTarget = prepareTarget(this._source);
            this.moduleTarget = prepareModule(this._source);
            this.noImplicitAny = typeof this._source.noImplicitAny === "undefined" ? undefined : !!this._source.noImplicitAny;
            this.disallowAsi = typeof this._source.disallowAsi === "undefined" ? undefined : !!this._source.disallowAsi;

            this._showexectime = !!this._source._showexectime;

            //experimental
            this.watch = prepareWatch(this._source._watch, this.expandedFiles(), _io);

            checkIgnoreTypeCheck(this._source, this._io);
        }
        Opts.prototype.expandedFiles = function () {
            return this.grunt.file.expand(this.gruntFile.orig.src);
        };

        Opts.prototype.createCompilationSettings = function () {
            var settings = new TypeScript.CompilationSettings(), dest = this.destinationPath, ioHost = this._io;

            if (this.outputOne) {
                settings.outFileOption = _path.resolve(ioHost.currentPath(), dest);
            }

            settings.mapSourceFiles = this.sourceMap;
            settings.generateDeclarationFiles = this.declaration;
            settings.removeComments = this.removeComments;

            if (typeof this.langTarget !== "undefined") {
                settings.codeGenTarget = this.langTarget;
            }
            if (typeof this.moduleTarget !== "undefined") {
                settings.moduleGenTarget = this.moduleTarget;
            }
            if (typeof this.noImplicitAny !== "undefined") {
                settings.noImplicitAny = this.noImplicitAny;
            }
            if (typeof this.disallowAsi !== "undefined") {
                settings.allowAutomaticSemicolonInsertion = this.disallowAsi;
            }

            settings.noLib = this.noLib;
            settings.noResolve = this.noResolve;

            return TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings);
        };
        return Opts;
    })();
    GruntTs.Opts = Opts;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/tsc/tsc.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="./io.ts" />
///<reference path="./opts.ts" />
var GruntTs;
(function (GruntTs) {
    var Q = require('q');

    var SourceFile = (function () {
        function SourceFile(scriptSnapshot, byteOrderMark) {
            this.scriptSnapshot = scriptSnapshot;
            this.byteOrderMark = byteOrderMark;
        }
        return SourceFile;
    })();

    var Task = (function () {
        function Task(grunt, tscBinPath, ioHost) {
            this.grunt = grunt;
            this.tscBinPath = tscBinPath;
            this.ioHost = ioHost;
            this.fileNameToSourceFile = new TypeScript.StringHashTable();
            this.hasErrors = false;
            this.resolvedFiles = [];
            this.logger = null;
            this.outputFiles = [];
            this.fileExistsCache = TypeScript.createIntrinsicsObject();
            this.resolvePathCache = TypeScript.createIntrinsicsObject();
        }
        Task.prototype.start = function (options) {
            var _this = this;
            this.options = options;
            this.compilationSettings = options.createCompilationSettings();
            this.logger = new TypeScript.NullLogger();

            return Q.promise(function (resolve, reject, notify) {
                if (!_this.options.watch) {
                    try  {
                        _this.exec();
                        resolve(true);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    _this.startWatch(resolve, reject);
                }
            });
        };

        Task.prototype.exec = function () {
            var start = Date.now();

            this.inputFiles = this.options.expandedFiles();
            this.outputFiles = [];
            this.resolve();
            this.compile();

            this.writeResult();

            if (this.options._showexectime) {
                this.grunt.log.writeln("execution time = " + (Date.now() - start) + " ms.");
            }
        };

        Task.prototype.startWatch = function (resolve, reject) {
            var _this = this;
            if (!this.options.watch) {
                resolve(true);
            }
            var watchPath = this.ioHost.resolvePath(this.options.watch.path), chokidar = require("chokidar"), watcher, registerEvents = function () {
                console.log("");
                console.log("Watching directory.... " + watchPath);

                watcher = chokidar.watch(watchPath, { ignoreInitial: true, persistent: true });
                watcher.on("add", function (path) {
                    _this.ioHost.stdout.WriteLine("Added".cyan + " " + path);
                    handleEvent(path);
                }).on("change", function (path) {
                    _this.ioHost.stdout.WriteLine("Changed".cyan + " " + path);
                    handleEvent(path);
                }).on("unlink", function (path) {
                    _this.ioHost.stdout.WriteLine("Unlinked".cyan + " " + path);
                    handleEvent(path);
                }).on("error", function (error) {
                    _this.ioHost.stdout.WriteLine("Error".red + ": " + error);
                });
            }, handleEvent = function (path) {
                path = _this.ioHost.normalizePath(path);

                if (!/\.ts$/.test(path)) {
                    return;
                }
                watcher.close();

                _this.fileNameToSourceFile.remove(path);

                try  {
                    _this.exec();
                } catch (e) {
                    ;
                }
                registerEvents();
            };
            registerEvents();
        };

        Task.prototype.resolve = function () {
            var _this = this;
            var resolvedFiles = [];
            var includeDefaultLibrary = !this.compilationSettings.noLib();

            if (this.options.noResolve) {
                for (var i = 0, n = this.inputFiles.length; i < n; i++) {
                    var inputFile = this.inputFiles[i];
                    var referencedFiles = [];
                    var importedFiles = [];

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
            } else {
                var resolutionResults = TypeScript.ReferenceResolver.resolve(this.inputFiles, this, this.compilationSettings.useCaseSensitiveFileResolution());
                includeDefaultLibrary = !this.compilationSettings.noLib() && !resolutionResults.seenNoDefaultLibTag;
                resolvedFiles = resolutionResults.resolvedFiles;
                resolutionResults.diagnostics.forEach(function (d) {
                    return _this.addDiagnostic(d);
                });
            }

            if (includeDefaultLibrary) {
                var libraryResolvedFile = {
                    path: this.ioHost.combine(this.tscBinPath, "lib.d.ts"),
                    referencedFiles: [],
                    importedFiles: []
                };

                // Prepend the library to the resolved list
                resolvedFiles = [libraryResolvedFile].concat(resolvedFiles);
            }

            this.resolvedFiles = resolvedFiles;
        };

        Task.prototype.compile = function () {
            var _this = this;
            var g = require("./modules/compiler");

            //var compiler = new TypeScript.TypeScriptCompiler(this.logger, this.compilationSettings);
            var compiler = new g.Compiler(this.logger, this.compilationSettings);

            this.resolvedFiles.forEach(function (resolvedFile) {
                var sourceFile = _this.getSourceFile(resolvedFile.path);
                compiler.addFile(resolvedFile.path, sourceFile.scriptSnapshot, sourceFile.byteOrderMark, /*version:*/ 0, false, resolvedFile.referencedFiles);
            });
            var ignoreError = this.options.ignoreError, hasOutputFile = false;
            for (var it = compiler.compile(function (path) {
                return _this.resolvePath(path);
            }); it.moveNext();) {
                var result = it.current(), hasError = false;

                result.diagnostics.forEach(function (d) {
                    var info = d.info();
                    if (info.category === 1 /* Error */) {
                        hasError = true;
                    }
                    _this.addDiagnostic(d);
                });
                if (hasError && !ignoreError) {
                    throw new Error();
                }

                hasOutputFile = !!result.outputFiles.length || hasOutputFile;
                if (!this.tryWriteOutputFiles(result.outputFiles)) {
                    throw new Error();
                }
            }
            if (hasError && !hasOutputFile) {
                throw new Error();
            }
        };

        Task.prototype.writeResult = function () {
            var result = { js: [], m: [], d: [], other: [] }, resultMessage, pluralizeFile = function (n) {
                return (n + " file") + ((n === 1) ? "" : "s");
            };
            this.outputFiles.forEach(function (item) {
                if (/\.js$/.test(item))
                    result.js.push(item);
                else if (/\.js\.map$/.test(item))
                    result.m.push(item);
                else if (/\.d\.ts$/.test(item))
                    result.d.push(item);
                else
                    result.other.push(item);
            });

            resultMessage = "js: " + pluralizeFile(result.js.length) + ", map: " + pluralizeFile(result.m.length) + ", declaration: " + pluralizeFile(result.d.length);
            if (this.options.outputOne) {
                if (result.js.length > 0) {
                    this.grunt.log.writeln("File " + (result.js[0])["cyan"] + " created.");
                }
                this.grunt.log.writeln(resultMessage);
            } else {
                this.grunt.log.writeln(pluralizeFile(this.outputFiles.length)["cyan"] + " created. " + resultMessage);
            }
        };

        Task.prototype.getScriptSnapshot = function (fileName) {
            return this.getSourceFile(fileName).scriptSnapshot;
        };

        Task.prototype.getSourceFile = function (fileName) {
            var sourceFile = this.fileNameToSourceFile.lookup(fileName);
            if (!sourceFile) {
                // Attempt to read the file
                var fileInformation;

                try  {
                    fileInformation = this.ioHost.readFile(fileName, this.compilationSettings.codepage());
                } catch (e) {
                    fileInformation = new TypeScript.FileInformation("", 0 /* None */);
                }

                var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation.contents);
                sourceFile = new SourceFile(snapshot, fileInformation.byteOrderMark);
                this.fileNameToSourceFile.add(fileName, sourceFile);
            }

            return sourceFile;
        };

        Task.prototype.resolveRelativePath = function (path, directory) {
            var unQuotedPath = TypeScript.stripStartAndEndQuotes(path);
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

        Task.prototype.fileExists = function (path) {
            var exists = this.fileExistsCache[path];
            if (exists === undefined) {
                exists = this.ioHost.fileExists(path);
                this.fileExistsCache[path] = exists;
            }
            return exists;
        };

        Task.prototype.getParentDirectory = function (path) {
            return this.ioHost.dirName(path);
        };

        Task.prototype.addDiagnostic = function (diagnostic) {
            var diagnosticInfo = diagnostic.info();
            if (diagnosticInfo.category === 1 /* Error */) {
                this.hasErrors = true;
            }

            if (diagnostic.fileName()) {
                this.ioHost.stderr.Write(diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + "): ");
            }

            this.ioHost.stderr.WriteLine(diagnostic.message());
        };

        Task.prototype.tryWriteOutputFiles = function (outputFiles) {
            for (var i = 0, n = outputFiles.length; i < n; i++) {
                var outputFile = outputFiles[i];

                try  {
                    this.writeFile(outputFile.name, outputFile.text, outputFile.writeByteOrderMark);
                } catch (e) {
                    this.addDiagnostic(new TypeScript.Diagnostic(outputFile.name, null, 0, 0, TypeScript.DiagnosticCode.Emit_Error_0, [e.message]));
                    return false;
                }
            }

            return true;
        };

        Task.prototype.writeFile = function (fileName, contents, writeByteOrderMark) {
            var preparedFileName = this.prepareFileName(fileName);
            var path = this.ioHost.resolvePath(preparedFileName);
            var dirName = this.ioHost.dirName(path);
            this.createDirectoryStructure(dirName);

            contents = this.prepareSourcePath(fileName, preparedFileName, contents);

            this.ioHost.writeFile(path, contents, writeByteOrderMark);

            this.outputFiles.push(path);
        };

        Task.prototype.prepareFileName = function (fileName) {
            var newFileName = fileName, basePath = this.options.basePath;

            if (this.options.outputOne) {
                return newFileName;
            }
            if (!this.options.destinationPath) {
                return newFileName;
            }

            var currentPath = this.ioHost.currentPath(), relativePath = this.ioHost.relativePath(currentPath, fileName);

            if (basePath) {
                if (relativePath.substr(0, basePath.length) !== basePath) {
                    throw new Error(fileName + " is not started base_path");
                }
                relativePath = relativePath.substr(basePath.length);
            }

            return this.ioHost.resolveMulti(currentPath, this.options.destinationPath, relativePath);
        };

        Task.prototype.prepareSourcePath = function (sourceFileName, preparedFileName, contents) {
            var io = this.ioHost;
            if (this.options.outputOne) {
                return contents;
            }
            if (sourceFileName === preparedFileName) {
                return contents;
            }
            if (!this.options.destinationPath) {
                return contents;
            }
            if (!(/\.js\.map$/.test(sourceFileName))) {
                return contents;
            }
            var mapData = JSON.parse(contents), source = mapData.sources[0];
            mapData.sources.length = 0;
            var relative = io.relativePath(io.dirName(preparedFileName), sourceFileName);
            mapData.sources.push(io.combine(io.dirName(relative), source));
            return JSON.stringify(mapData);
        };

        Task.prototype.createDirectoryStructure = function (dirName) {
            if (this.ioHost.directoryExists(dirName)) {
                return;
            }

            var parentDirectory = this.ioHost.dirName(dirName);
            if (parentDirectory != "") {
                this.createDirectoryStructure(parentDirectory);
            }
            this.ioHost.createDirectory(dirName);
        };

        Task.prototype.directoryExists = function (path) {
            return this.ioHost.directoryExists(path);
            ;
        };

        Task.prototype.resolvePath = function (path) {
            var cachedValue = this.resolvePathCache[path];
            if (!cachedValue) {
                cachedValue = this.ioHost.resolvePath(path);
                this.resolvePathCache[path] = cachedValue;
            }
            return cachedValue;
        };
        return Task;
    })();
    GruntTs.Task = Task;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="io.ts" />
///<reference path="opts.ts" />
///<reference path="task.ts" />
module.exports = function (grunt) {
    var _path = require("path"), _vm = require('vm'), _os = require('os'), Q = require('q'), getTsBinPathWithLoad = function () {
        var typeScriptBinPath = _path.dirname(require.resolve("typescript")), typeScriptPath = _path.resolve(typeScriptBinPath, "typescript.js"), code;

        if (!typeScriptBinPath) {
            grunt.fail.warn("typescript.js not found. please 'npm install typescript'.");
            return "";
        }

        code = grunt.file.read(typeScriptPath);
        _vm.runInThisContext(code, typeScriptPath);

        return typeScriptBinPath;
    }, setGlobalOption = function (options) {
        if (!TypeScript || !options) {
            return;
        }
        TypeScript.newLine = function () {
            return _os.EOL;
        };
        if (options.newLine !== 2 /* auto */) {
            TypeScript.newLine = (function (v) {
                return function () {
                    return v;
                };
            })(options.newLine === 0 /* crLf */ ? "\r\n" : "\n");
        }
        if (options.indentStep > -1) {
            TypeScript.Indenter.indentStep = options.indentStep;
            TypeScript.Indenter.indentStepString = Array(options.indentStep + 1).join(" ");
        }
        if (options.useTabIndent) {
            TypeScript.Indenter.indentStep = 1;
            TypeScript.Indenter.indentStepString = "\t";
        }
    };

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var self = this, typescriptBinPath = getTsBinPathWithLoad(), promises = [], done = self.async();
        self.files.forEach(function (gruntFile) {
            var io = new GruntTs.GruntIO(grunt), opts = new GruntTs.Opts(self.options({}), grunt, gruntFile, io);

            setGlobalOption(opts);
            promises.push((new GruntTs.Task(grunt, typescriptBinPath, io)).start(opts));
        });
        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
};
