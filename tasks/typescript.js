///<reference path="../typings/q/Q.d.ts" />
var GruntTs;
(function (GruntTs) {
    var util;
    (function (util) {
        var Q = require('q');
        function isStr(val) {
            return Object.prototype.toString.call(val) === "[object String]";
        }
        util.isStr = isStr;
        function isBool(val) {
            return Object.prototype.toString.call(val) === "[object Boolean]";
        }
        util.isBool = isBool;
        function isArray(val) {
            return Object.prototype.toString.call(val) === "[object Array]";
        }
        util.isArray = isArray;
        function isUndef(val) {
            return typeof val === "undefined";
        }
        util.isUndef = isUndef;
        function asyncEach(items, callback) {
            return Q.Promise(function (resolve, reject, notify) {
                var length = items.length, exec = function (i) {
                    if (length <= i) {
                        resolve(true);
                        return;
                    }
                    var item = items[i];
                    callback(item, i, function () {
                        i = i + 1;
                        exec(i);
                    });
                };
                exec(0);
            });
        }
        util.asyncEach = asyncEach;
        function writeError(str) {
            console.log('>> '.red + str.trim().replace(/\n/g, '\n>> '.red));
        }
        util.writeError = writeError;
        function writeInfo(str) {
            console.log('>> '.cyan + str.trim().replace(/\n/g, '\n>> '.cyan));
        }
        util.writeInfo = writeInfo;
        function writeWarn(str) {
            console.log('>> '.yellow + str.trim().replace(/\n/g, '\n>> '.cyan));
        }
        util.writeWarn = writeWarn;
        function write(str) {
            console.log(str);
        }
        util.write = write;
    })(util = GruntTs.util || (GruntTs.util = {}));
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />
///<reference path="./util.ts" />
var GruntTs;
(function (GruntTs) {
    var _path = require("path"), _fs = require("fs");
    function prepareBasePath(opt) {
        var result = "";
        if (GruntTs.util.isStr(opt.basePath)) {
            result = opt.basePath;
        }
        if (!result) {
            return undefined;
        }
        result = ts.normalizePath(result);
        if (result.lastIndexOf("/") !== result.length - 1) {
            result = result + "/";
        }
        return result;
    }
    function prepareRemoveComments(opt) {
        var result = undefined;
        if (!GruntTs.util.isUndef(opt.comment)) {
            GruntTs.util.writeWarn("The 'comment' option will be obsolated. Please use the 'removeComments'. (default false)");
        }
        if (!GruntTs.util.isUndef(opt.removeComments)) {
            result = !!opt.removeComments;
        }
        else if (!GruntTs.util.isUndef(opt.comment)) {
            result = !opt.comment;
        }
        return result;
    }
    function prepareTarget(opt) {
        var result = undefined;
        if (opt.target) {
            var temp = (opt.target + "").toLowerCase();
            if (temp === 'es3') {
                result = 0 /* ES3 */;
            }
            else if (temp == 'es5') {
                result = 1 /* ES5 */;
            }
        }
        return result;
    }
    function prepareModule(opt) {
        var result = 0 /* None */;
        if (opt.module) {
            var temp = (opt.module + "").toLowerCase();
            if (temp === 'commonjs' || temp === 'node') {
                result = 1 /* CommonJS */;
            }
            else if (temp === 'amd') {
                result = 2 /* AMD */;
            }
        }
        return result;
    }
    function prepareWatch(opt, files) {
        var after = [], before = [], val = opt.watch, getDirNames = function (files) {
            return files.map(function (file) {
                if (_fs.existsSync(file)) {
                    if (_fs.statSync(file).isDirectory()) {
                        return file;
                    }
                }
                else {
                    if (!_path.extname(file)) {
                        return file;
                    }
                }
                return ts.normalizePath(_path.resolve(_path.dirname(file)));
            });
        }, extractPath = function (files) {
            var dirNames = getDirNames(files), result = dirNames.reduce(function (prev, curr) {
                if (!prev) {
                    return curr;
                }
                var left = ts.normalizePath(_path.relative(prev, curr)), right = ts.normalizePath(_path.relative(curr, prev)), match = left.match(/^(\.\.(\/)?)+/);
                if (match) {
                    return ts.normalizePath(_path.resolve(prev, match[0]));
                }
                match = right.match(/^(\.\.\/)+/);
                if (match) {
                    return ts.normalizePath(_path.resolve(curr, match[0]));
                }
                return prev;
            }, undefined);
            if (result) {
                return [result];
            }
        };
        if (!val) {
            return undefined;
        }
        if (GruntTs.util.isStr(val) || GruntTs.util.isArray(val)) {
            return {
                path: GruntTs.util.isStr(val) ? [val] : val,
                after: [],
                before: [],
                atBegin: false
            };
        }
        if (GruntTs.util.isBool(val) && !!val) {
            return {
                path: extractPath(files),
                after: [],
                before: [],
                atBegin: false
            };
        }
        if (!val.path) {
            val.path = extractPath(files);
            if (!val.path) {
                GruntTs.util.writeWarn("Can't auto detect watch directory. Please place one or more files or set the path option.");
                return undefined;
            }
        }
        if (val.after && !GruntTs.util.isArray(val.after)) {
            after.push(val.after);
        }
        else if (GruntTs.util.isArray(val.after)) {
            after = val.after;
        }
        if (val.before && !GruntTs.util.isArray(val.before)) {
            before.push(val.before);
        }
        else if (GruntTs.util.isArray(val.before)) {
            before = val.before;
        }
        return {
            path: val.path,
            after: after,
            before: before,
            atBegin: !!val.atBegin
        };
    }
    function createGruntOptions(source, grunt, gruntFile) {
        function getTargetFiles() {
            return grunt.file.expand(gruntFile.orig.src);
        }
        function boolOrUndef(source, key) {
            return GruntTs.util.isUndef(source[key]) ? undefined : !!source[key];
        }
        var dest = ts.normalizePath(gruntFile.dest || ""), singleFile = !!dest && _path.extname(dest) === ".js";
        //if(source.watch){
        //    util.writeWarn("The 'watch' option is not implemented yet. However, I will implement soon.");
        //}
        if (source.newLine || source.indentStep || source.useTabIndent || source.disallowAsi) {
            GruntTs.util.writeWarn("The 'newLine', 'indentStep', 'useTabIndent' and 'disallowAsi' options is not implemented. It is because a function could not be accessed with a new compiler or it was deleted.");
        }
        return {
            removeComments: prepareRemoveComments(source),
            sourceMap: boolOrUndef(source, "sourceMap"),
            declaration: boolOrUndef(source, "declaration"),
            targetFiles: getTargetFiles,
            dest: dest,
            singleFile: singleFile,
            basePath: prepareBasePath(source),
            target: prepareTarget(source),
            module: prepareModule(source),
            out: singleFile ? dest : undefined,
            noLib: boolOrUndef(source, "noLib"),
            noImplicitAny: boolOrUndef(source, "noImplicitAny"),
            noResolve: boolOrUndef(source, "noResolve"),
            ignoreError: boolOrUndef(source, "ignoreError"),
            gWatch: prepareWatch(source, getTargetFiles())
        };
    }
    GruntTs.createGruntOptions = createGruntOptions;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />
var GruntTs;
(function (GruntTs) {
    var _fs = require('fs'), _os = require('os'), _path = require('path');
    function createIO(grunt) {
        var currentPath = ts.normalizePath(_path.resolve("."));
        function readFile(fileName, encoding) {
            if (!_fs.existsSync(fileName)) {
                return undefined;
            }
            var buffer = _fs.readFileSync(fileName);
            var len = buffer.length;
            if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
                // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
                // flip all byte pairs and treat as little endian.
                len &= ~1;
                for (var i = 0; i < len; i += 2) {
                    var temp = buffer[i];
                    buffer[i] = buffer[i + 1];
                    buffer[i + 1] = temp;
                }
                return buffer.toString("utf16le", 2);
            }
            if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
                // Little endian UTF-16 byte order mark detected
                return buffer.toString("utf16le", 2);
            }
            if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                // UTF-8 byte order mark detected
                return buffer.toString("utf8", 3);
            }
            // Default is UTF-8 with no byte order mark
            return buffer.toString("utf8");
        }
        function writeFile(fileName, data, writeByteOrderMark) {
            // If a BOM is required, emit one
            if (writeByteOrderMark) {
                data = '\uFEFF' + data;
            }
            _fs.writeFileSync(fileName, data, "utf8");
        }
        function directoryExists(path) {
            return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
        }
        function createDirectory(directoryName) {
            if (!directoryExists(directoryName)) {
                _fs.mkdirSync(directoryName);
            }
        }
        function abs(fileName) {
            return ts.normalizePath(_path.resolve(".", ts.normalizePath(fileName)));
        }
        return {
            readFile: readFile,
            writeFile: writeFile,
            createDirectory: createDirectory,
            directoryExists: directoryExists,
            abs: abs,
            currentPath: function () {
                return currentPath;
            }
        };
    }
    GruntTs.createIO = createIO;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/node/node.d.ts" />
///<reference path="./util.ts" />
var GruntTs;
(function (GruntTs) {
    var _path = require("path"), _fs = require("fs");
    function createWatcher(watchPaths, callback) {
        var chokidar = require("chokidar"), watcher, timeoutId, callbacking = false, events = {};
        function start() {
            if (watcher) {
                return;
            }
            watcher = chokidar.watch(watchPaths, { ignoreInitial: true, persistent: true });
            watcher.on("add", function (path, stats) {
                add(path, "add", stats);
            }).on("change", function (path, stats) {
                add(path, "change", stats);
            }).on("unlink", function (path, stats) {
                add(path, "unlink", stats);
            }).on("error", function (error) {
                GruntTs.util.writeError(error);
            });
        }
        function add(path, eventName, stats) {
            if (_path.extname(path) !== ".ts") {
                return;
            }
            path = ts.normalizePath(path);
            if (stats && stats.mtime) {
                events[path] = {
                    mtime: stats.mtime.getTime(),
                    ev: eventName
                };
            }
            else {
                events[path] = {
                    mtime: _fs.statSync(path).mtime.getTime(),
                    ev: eventName
                };
            }
            GruntTs.util.write(eventName.cyan + " " + path);
            executeCallback();
        }
        function clone(value) {
            var result = {};
            Object.keys(value).forEach(function (item) {
                result[item] = value[item];
            });
            return result;
        }
        function executeCallback() {
            if (!Object.keys(events).length) {
                return;
            }
            if (callbacking) {
                return;
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(function () {
                callbacking = true;
                var value = clone(events);
                events = {};
                try {
                    callback(value, function () {
                        callbacking = false;
                        executeCallback();
                    });
                }
                catch (e) {
                    callbacking = false;
                }
            }, 1000);
        }
        return {
            start: start
        };
    }
    GruntTs.createWatcher = createWatcher;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />
///<reference path="./util.ts" />
///<reference path="./io.ts" />
///<reference path="./watcher.ts" />
var GruntTs;
(function (GruntTs) {
    var _fs = require("fs"), _os = require("os"), _path = require("path"), existingDirectories = {};
    function directoryExists(io, directoryPath) {
        if (ts.hasProperty(existingDirectories, directoryPath)) {
            return true;
        }
        //TODO:
        if (io.directoryExists(directoryPath)) {
            existingDirectories[directoryPath] = true;
            return true;
        }
        return false;
    }
    function ensureDirectoriesExist(io, directoryPath) {
        if (directoryPath.length > ts.getRootLength(directoryPath) && !directoryExists(io, directoryPath)) {
            var parentDirectory = ts.getDirectoryPath(directoryPath);
            ensureDirectoriesExist(io, parentDirectory);
            //TODO:
            io.createDirectory(directoryPath);
        }
    }
    function prepareOutputDir(fileName, options, io) {
        if (options.singleFile || !options.dest) {
            return fileName;
        }
        var currentPath = io.currentPath(), relativePath = ts.normalizePath(_path.relative(currentPath, fileName)), basePath = options.basePath;
        if (basePath) {
            if (relativePath.substr(0, basePath.length) !== basePath) {
                throw new Error(fileName + " is not started base_path");
            }
            relativePath = relativePath.substr(basePath.length);
        }
        return ts.normalizePath(_path.resolve(currentPath, options.dest, relativePath));
    }
    function prepareSourcePath(sourceFileName, preparedFileName, contents, options) {
        if (options.singleFile || !options.dest) {
            return contents;
        }
        if (sourceFileName === preparedFileName) {
            return contents;
        }
        if (!(/\.js\.map$/.test(sourceFileName))) {
            return contents;
        }
        var mapData = JSON.parse(contents), source = mapData.sources[0];
        mapData.sources.length = 0;
        var relative = _path.relative(_path.dirname(preparedFileName), sourceFileName);
        mapData.sources.push(ts.normalizePath(_path.join(_path.dirname(relative), source)));
        return JSON.stringify(mapData);
    }
    function createCompilerHost(binPath, options, io) {
        var platform = _os.platform(), 
        // win32\win64 are case insensitive platforms, MacOS (darwin) by default is also case insensitive
        useCaseSensitiveFileNames = platform !== "win32" && platform !== "win64" && platform !== "darwin", currentDirectory, outputFiles = [], sourceFileCache = {}, newSourceFiles = {};
        function getCanonicalFileName(fileName) {
            // if underlying system can distinguish between two files whose names differs only in cases then file name already in canonical form.
            // otherwise use toLowerCase as a canonical form.
            return useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }
        function createSourceFile(fileName, text, languageVersion, version) {
            if (text !== undefined) {
                var result = ts.createSourceFile(fileName, text, languageVersion, "0");
                result.mtime = _fs.statSync(fileName).mtime.getTime();
                return result;
            }
        }
        function getSourceFile(fileName, languageVersion, onError) {
            fileName = ts.normalizePath(_path.resolve(io.currentPath(), fileName));
            if (fileName in sourceFileCache) {
                return sourceFileCache[fileName];
            }
            try {
                var text = io.readFile(fileName, options.charset);
            }
            catch (e) {
                if (onError) {
                    onError(e.message);
                }
                text = "";
            }
            var result = createSourceFile(fileName, text, languageVersion, "0"); //text !== undefined ? ts.createSourceFile(fileName, text, languageVersion, /*version:*/ "0") : undefined;
            if (result) {
                sourceFileCache[fileName] = result;
                newSourceFiles[fileName] = result;
            }
            return result;
        }
        function writeFile(fileName, data, writeByteOrderMark, onError) {
            if (!options.singleFile) {
                var tsFile = fileName.replace(/\.js\.map$/, ".ts").replace(/\.js$/, ".ts");
                if (!(tsFile in newSourceFiles)) {
                    return;
                }
            }
            //出力先ディレクトリのパスに変換
            var newFileName = prepareOutputDir(fileName, options, io);
            //map ファイルの参照先パスを変換
            var targetData = prepareSourcePath(fileName, newFileName, data, options);
            try {
                ensureDirectoriesExist(io, ts.getDirectoryPath(ts.normalizePath(newFileName)));
                //TODO:
                io.writeFile(newFileName, targetData, writeByteOrderMark);
                outputFiles.push(newFileName);
            }
            catch (e) {
                if (onError)
                    onError(e.message);
            }
        }
        function writeResult(ms) {
            var result = { js: [], m: [], d: [], other: [] }, resultMessage, pluralizeFile = function (n) { return (n + " file") + ((n === 1) ? "" : "s"); };
            outputFiles.forEach(function (item) {
                if (/\.js$/.test(item))
                    result.js.push(item);
                else if (/\.js\.map$/.test(item))
                    result.m.push(item);
                else if (/\.d\.ts$/.test(item))
                    result.d.push(item);
                else
                    result.other.push(item);
            });
            resultMessage = "js: " + pluralizeFile(result.js.length) + ", map: " + pluralizeFile(result.m.length) + ", declaration: " + pluralizeFile(result.d.length) + " (" + ms + "ms)";
            if (options.singleFile) {
                if (result.js.length > 0) {
                    GruntTs.util.write("File " + (result.js[0])["cyan"] + " created.");
                }
                GruntTs.util.write(resultMessage);
            }
            else {
                GruntTs.util.write(pluralizeFile(outputFiles.length)["cyan"] + " created. " + resultMessage);
            }
        }
        function reset(fileNames) {
            var targets = fileNames || [];
            targets.forEach(function (f) {
                if (f in sourceFileCache) {
                    delete sourceFileCache[f];
                }
            });
            outputFiles.length = 0;
            newSourceFiles = {};
        }
        return {
            getSourceFile: getSourceFile,
            getDefaultLibFilename: function () {
                return ts.combinePaths(binPath, "lib.d.ts");
            },
            writeFile: writeFile,
            getCurrentDirectory: function () { return ts.normalizePath(_path.resolve(".")); },
            useCaseSensitiveFileNames: function () { return useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function () { return _os.EOL; },
            writeResult: writeResult,
            reset: reset
        };
    }
    GruntTs.createCompilerHost = createCompilerHost;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />
///<reference path="./option.ts" />
///<reference path="./host.ts" />
///<reference path="./io.ts" />
///<reference path="./watcher.ts" />
var GruntTs;
(function (GruntTs) {
    var Q = require("q"), _path = require("path");
    function execute(grunt, options, host) {
        return Q.Promise(function (resolve, reject, notify) {
            if (options.gWatch) {
                watch(grunt, options, host);
            }
            else {
                if (compile(options, host)) {
                    resolve(true);
                }
                else {
                    reject(false);
                }
            }
        });
    }
    GruntTs.execute = execute;
    function watch(grunt, options, host) {
        var watchOpt = options.gWatch, watchPath = watchOpt.path, targetPaths = {}, watcher = GruntTs.createWatcher(watchPath, function (files, done) {
            startCompile(Object.keys(files)).finally(function () {
                done();
            });
        }), startCompile = function (files) {
            return runTask(grunt, watchOpt.before).then(function () {
                recompile(options, host, files);
                return runTask(grunt, watchOpt.after);
            }).then(function () {
                writeWatching(watchPath);
            });
        };
        if (watchOpt.atBegin) {
            startCompile().finally(function () {
                writeWatching(watchPath);
                watcher.start();
            });
        }
        else {
            writeWatching(watchPath);
            watcher.start();
        }
    }
    function writeWatching(watchPath) {
        GruntTs.util.write("");
        GruntTs.util.write("Watching... " + watchPath);
    }
    function recompile(options, host, updateFiles) {
        if (updateFiles === void 0) { updateFiles = []; }
        host.reset(updateFiles);
        compile(options, host);
    }
    function compile(options, host) {
        var start = Date.now(), program = ts.createProgram(options.targetFiles(), options, host), errors = program.getDiagnostics();
        if (writeDiagnostics(errors)) {
            return false;
        }
        var checker = program.getTypeChecker(true);
        errors = checker.getDiagnostics();
        if (writeDiagnostics(errors, !!options.ignoreError)) {
            if (!options.ignoreError) {
                return false;
            }
        }
        var emitOutput = checker.emitFiles();
        var emitErrors = emitOutput.errors;
        if (writeDiagnostics(emitErrors)) {
            return false;
        }
        host.writeResult(Date.now() - start);
        return true;
    }
    function writeDiagnostics(diags, isWarn) {
        if (isWarn === void 0) { isWarn = false; }
        diags.forEach(function (d) {
            var output = "";
            if (d.file) {
                var loc = d.file.getLineAndCharacterFromPosition(d.start);
                output += d.file.filename + "(" + loc.line + "," + loc.character + "): ";
            }
            var category = ts.DiagnosticCategory[d.category].toLowerCase();
            output += category + " TS" + d.code + ": " + d.messageText;
            if (isWarn) {
                GruntTs.util.writeWarn(output);
            }
            else {
                GruntTs.util.writeError(output);
            }
        });
        return !!diags.length;
    }
    function runTask(grunt, tasks) {
        return GruntTs.util.asyncEach(tasks, function (task, index, next) {
            grunt.util.spawn({
                grunt: true,
                args: [task].concat(grunt.option.flags()),
                opts: { stdio: 'inherit' }
            }, function (err, result, code) {
                next();
            });
        });
    }
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />
///<reference path="./option.ts" />
///<reference path="./host.ts" />
///<reference path="./task.ts" />
///<reference path="./io.ts" />
module.exports = function (grunt) {
    var _path = require("path"), _vm = require('vm'), _os = require('os'), Q = require('q');
    function getTsBinPathWithLoad() {
        var typeScriptBinPath = _path.dirname(require.resolve("typescript")), typeScriptPath = _path.resolve(typeScriptBinPath, "tsc.js"), code;
        if (!typeScriptBinPath) {
            grunt.fail.warn("typescript.js not found. please 'npm install typescript'.");
            return "";
        }
        code = grunt.file.read(typeScriptPath).toString();
        //末尾にあるコマンドラインの実行行を削除 "ts.executeCommandLine(sys.args);"
        code = code.substr(0, code.trim().length - 32);
        _vm.runInThisContext(code, typeScriptPath);
        return typeScriptBinPath;
    }
    grunt.registerMultiTask('typescript', function () {
        var self = this, done = self.async(), promises, binPath = getTsBinPathWithLoad();
        promises = self.files.map(function (gruntFile) {
            var opt = GruntTs.createGruntOptions(self.options({}), grunt, gruntFile), host = GruntTs.createCompilerHost(binPath, opt, GruntTs.createIO(grunt));
            return GruntTs.execute(grunt, opt, host);
        });
        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
};
