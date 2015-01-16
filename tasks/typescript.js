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
        function writeAbort(str) {
            console.log((str || "").red);
        }
        util.writeAbort = writeAbort;
        function writeError(str) {
            console.log(">> ".red + str.trim().replace(/\n/g, "\n>> ".red));
        }
        util.writeError = writeError;
        function writeInfo(str) {
            console.log(">> ".cyan + str.trim().replace(/\n/g, "\n>> ".cyan));
        }
        util.writeInfo = writeInfo;
        function writeWarn(str) {
            console.log(">> ".yellow + str.trim().replace(/\n/g, "\n>> ".yellow));
        }
        util.writeWarn = writeWarn;
        function write(str) {
            console.log(str);
        }
        util.write = write;
        function writeDebug(str) {
            console.log(("-- " + str.trim().replace(/\n/g, "\n-- ")).grey);
        }
        util.writeDebug = writeDebug;
        //ts
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        function hasProperty(value, key) {
            return hasOwnProperty.call(value, key);
        }
        util.hasProperty = hasProperty;
        var colonCode = 0x3A;
        var slashCode = 0x2F;
        function getRootLength(path) {
            if (path.charCodeAt(0) === slashCode) {
                if (path.charCodeAt(1) !== slashCode)
                    return 1;
                var p1 = path.indexOf("/", 2);
                if (p1 < 0)
                    return 2;
                var p2 = path.indexOf("/", p1 + 1);
                if (p2 < 0)
                    return p1 + 1;
                return p2 + 1;
            }
            if (path.charCodeAt(1) === colonCode) {
                if (path.charCodeAt(2) === slashCode)
                    return 3;
                return 2;
            }
            return 0;
        }
        util.getRootLength = getRootLength;
        function normalizeSlashes(path) {
            return path.replace(/\\/g, "/");
        }
        util.normalizeSlashes = normalizeSlashes;
        var directorySeparator = "/";
        function getNormalizedParts(normalizedSlashedPath, rootLength) {
            var parts = normalizedSlashedPath.substr(rootLength).split(directorySeparator);
            var normalized = [];
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                if (part !== ".") {
                    if (part === ".." && normalized.length > 0 && normalized[normalized.length - 1] !== "..") {
                        normalized.pop();
                    }
                    else {
                        normalized.push(part);
                    }
                }
            }
            return normalized;
        }
        function normalizePath(path) {
            var path = normalizeSlashes(path);
            var rootLength = getRootLength(path);
            var normalized = getNormalizedParts(path, rootLength);
            return path.substr(0, rootLength) + normalized.join(directorySeparator);
        }
        util.normalizePath = normalizePath;
        function combinePaths(path1, path2) {
            if (!(path1 && path1.length))
                return path2;
            if (!(path2 && path2.length))
                return path1;
            if (path2.charAt(0) === directorySeparator)
                return path2;
            if (path1.charAt(path1.length - 1) === directorySeparator)
                return path1 + path2;
            return path1 + directorySeparator + path2;
        }
        util.combinePaths = combinePaths;
        function getDirectoryPath(path) {
            return path.substr(0, Math.max(getRootLength(path), path.lastIndexOf(directorySeparator)));
        }
        util.getDirectoryPath = getDirectoryPath;
    })(util = GruntTs.util || (GruntTs.util = {}));
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/typescriptServices.d.ts" />
var GruntTs;
(function (GruntTs) {
    var _fs = require('fs'), _os = require('os'), _path = require('path');
    function createIO(grunt, binPath) {
        var currentPath = GruntTs.util.normalizePath(_path.resolve("."));
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
            return GruntTs.util.normalizePath(_path.resolve(".", GruntTs.util.normalizePath(fileName)));
        }
        return {
            readFile: readFile,
            writeFile: writeFile,
            createDirectory: createDirectory,
            directoryExists: directoryExists,
            abs: abs,
            currentPath: function () {
                return currentPath;
            },
            binPath: function () {
                return binPath;
            },
            verbose: function (message) {
                //console.log(("-- " + str.trim().replace(/\n/g, "\n-- ")).grey);
                grunt.verbose.writeln((message + "").grey);
            }
        };
    }
    GruntTs.createIO = createIO;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/typescriptServices.d.ts" />
///<reference path="./util.ts" />
///<reference path="./io.ts" />
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
        result = GruntTs.util.normalizePath(result);
        if (result.lastIndexOf("/") !== result.length - 1) {
            result = result + "/";
        }
        return result;
    }
    //function prepareRemoveComments(opt: any): boolean{
    //    var result: boolean = undefined;
    //    if(!util.isUndef(opt.comment)){
    //        util.writeWarn("The 'comment' option will be obsolated. Please use the 'removeComments'. (default false)");
    //    }
    //    if(!util.isUndef(opt.removeComments)){
    //        result = !!opt.removeComments;
    //    }else if(!util.isUndef(opt.comment)){
    //        result = !opt.comment;
    //    }
    //    return result;
    //}
    function prepareTarget(opt) {
        var result = 0 /* ES3 */;
        if (opt.target) {
            var temp = (opt.target + "").toLowerCase();
            if (temp === 'es3') {
                result = 0 /* ES3 */;
            }
            else if (temp == 'es5') {
                result = 1 /* ES5 */;
            }
            else if (temp == "es6") {
                result = 2 /* ES6 */;
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
                return GruntTs.util.normalizePath(_path.resolve(_path.dirname(file)));
            });
        }, extractPath = function (files) {
            var dirNames = getDirNames(files), result = dirNames.reduce(function (prev, curr) {
                if (!prev) {
                    return curr;
                }
                var left = GruntTs.util.normalizePath(_path.relative(prev, curr)), right = GruntTs.util.normalizePath(_path.relative(curr, prev)), match = left.match(/^(\.\.(\/)?)+/);
                if (match) {
                    return GruntTs.util.normalizePath(_path.resolve(prev, match[0]));
                }
                match = right.match(/^(\.\.\/)+/);
                if (match) {
                    return GruntTs.util.normalizePath(_path.resolve(curr, match[0]));
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
    function prepareExternalLibs(opt, io) {
        var target;
        if (!opt.extLibs) {
            return [];
        }
        if (GruntTs.util.isStr(opt.extLibs)) {
            target = [opt.extLibs];
        }
        if (GruntTs.util.isArray(opt.extLibs)) {
            target = opt.extLibs.concat();
        }
        if (!target) {
            return [];
        }
        return target.map(function (item) {
            if (item === "lib.core.d.ts" || item === "core") {
                return GruntTs.util.combinePaths(io.binPath(), "lib.core.d.ts");
            }
            if (item === "lib.dom.d.ts" || item === "dom") {
                return GruntTs.util.combinePaths(io.binPath(), "lib.dom.d.ts");
            }
            if (item === "lib.scriptHost.d.ts" || item === "scriptHost") {
                return GruntTs.util.combinePaths(io.binPath(), "lib.scriptHost.d.ts");
            }
            if (item === "lib.webworker.d.ts" || item === "webworker") {
                return GruntTs.util.combinePaths(io.binPath(), "lib.webworker.d.ts");
            }
            return item;
        });
    }
    function prepareNoEmitOnError(opt) {
        if (!GruntTs.util.isUndef(opt.ignoreError)) {
            GruntTs.util.writeWarn("The 'ignoreError' option will be obsoleted. Please use the 'noEmitOnError'. (default true)");
        }
        if (GruntTs.util.isUndef(opt.noEmitOnError)) {
            if (GruntTs.util.isUndef(opt.ignoreError)) {
                return true;
            }
            return !opt.ignoreError;
        }
        return !!opt.noEmitOnError;
    }
    function createGruntOptions(source, grunt, gruntFile, io) {
        var dest = GruntTs.util.normalizePath(gruntFile.dest || ""), singleFile = !!dest && _path.extname(dest) === ".js", targetVersion = prepareTarget(source);
        function getTargetFiles() {
            return grunt.file.expand(gruntFile.orig.src);
        }
        function boolOrUndef(source, key) {
            return GruntTs.util.isUndef(source[key]) ? undefined : !!source[key];
        }
        function getReferences() {
            var target;
            if (!source.references) {
                return [];
            }
            if (GruntTs.util.isStr(source.references)) {
                target = [source.references];
            }
            if (GruntTs.util.isArray(source.references)) {
                target = source.references.concat();
            }
            if (!target) {
                return [];
            }
            target = target.map(function (item) {
                if (item === "lib.core.d.ts" || item === "core") {
                    return GruntTs.util.combinePaths(io.binPath(), targetVersion === 2 /* ES6 */ ? "lib.core.es6.d.ts" : "lib.core.d.ts");
                }
                if (item === "lib.dom.d.ts" || item === "dom") {
                    return GruntTs.util.combinePaths(io.binPath(), "lib.dom.d.ts");
                }
                if (item === "lib.scriptHost.d.ts" || item === "scriptHost") {
                    return GruntTs.util.combinePaths(io.binPath(), "lib.scriptHost.d.ts");
                }
                if (item === "lib.webworker.d.ts" || item === "webworker") {
                    return GruntTs.util.combinePaths(io.binPath(), "lib.webworker.d.ts");
                }
                return item;
            });
            return grunt.file.expand(target);
        }
        //if(source.newLine || source.indentStep || source.useTabIndent || source.disallowAsi){
        //    util.writeWarn("The 'newLine', 'indentStep', 'useTabIndent' and 'disallowAsi' options is not implemented. It is because a function could not be accessed with a new compiler or it was deleted.");
        //}
        return {
            targetFiles: getTargetFiles,
            dest: dest,
            singleFile: singleFile,
            basePath: prepareBasePath(source),
            //ignoreError: boolOrUndef(source, "ignoreError"),
            gWatch: prepareWatch(source, getTargetFiles()),
            references: getReferences,
            _showNearlyTscCommand: !!grunt.option("showtsc"),
            tsOpts: {
                //removeComments: prepareRemoveComments(source),
                removeComments: boolOrUndef(source, "removeComments"),
                sourceMap: boolOrUndef(source, "sourceMap"),
                declaration: boolOrUndef(source, "declaration"),
                out: singleFile ? dest : undefined,
                noLib: boolOrUndef(source, "noLib"),
                noImplicitAny: boolOrUndef(source, "noImplicitAny"),
                noResolve: boolOrUndef(source, "noResolve"),
                target: targetVersion,
                module: prepareModule(source),
                preserveConstEnums: boolOrUndef(source, "preserveConstEnums"),
                noEmitOnError: prepareNoEmitOnError(source),
                suppressImplicitAnyIndexErrors: boolOrUndef(source, "suppressImplicitAnyIndexErrors")
            }
        };
    }
    GruntTs.createGruntOptions = createGruntOptions;
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
            watcher = chokidar.watch(watchPaths, { ignoreInitial: true, persistent: true, ignorePermissionErrors: true });
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
            path = GruntTs.util.normalizePath(path);
            if (stats && stats.mtime) {
                events[path] = {
                    mtime: stats.mtime.getTime(),
                    ev: eventName
                };
            }
            else {
                events[path] = {
                    mtime: eventName === "unlink" ? 0 : _fs.statSync(path).mtime.getTime(),
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
///<reference path="../typings/typescript/typescriptServices.d.ts" />
///<reference path="./util.ts" />
///<reference path="./io.ts" />
///<reference path="./watcher.ts" />
var GruntTs;
(function (GruntTs) {
    var _fs = require("fs"), _os = require("os"), _path = require("path"), existingDirectories = {};
    function directoryExists(io, directoryPath) {
        if (GruntTs.util.hasProperty(existingDirectories, directoryPath)) {
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
        if (directoryPath.length > GruntTs.util.getRootLength(directoryPath) && !directoryExists(io, directoryPath)) {
            var parentDirectory = GruntTs.util.getDirectoryPath(directoryPath);
            ensureDirectoriesExist(io, parentDirectory);
            //TODO:
            io.createDirectory(directoryPath);
        }
    }
    function prepareOutputDir(fileName, options, io) {
        if (options.singleFile || !options.dest) {
            return fileName;
        }
        var currentPath = io.currentPath(), relativePath = GruntTs.util.normalizePath(_path.relative(currentPath, fileName)), basePath = options.basePath;
        if (basePath) {
            if (relativePath.substr(0, basePath.length) !== basePath) {
                throw new Error(fileName + " is not started basePath");
            }
            relativePath = relativePath.substr(basePath.length);
        }
        return GruntTs.util.normalizePath(_path.resolve(currentPath, options.dest, relativePath));
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
        mapData.sources.push(GruntTs.util.normalizePath(_path.join(_path.dirname(relative), source)));
        return JSON.stringify(mapData);
    }
    function createCompilerHost(options, io) {
        var platform = _os.platform(), 
        // win32\win64 are case insensitive platforms, MacOS (darwin) by default is also case insensitive
        useCaseSensitiveFileNames = platform !== "win32" && platform !== "win64" && platform !== "darwin", outputFiles = [], sourceFileCache = {}, newSourceFiles = {};
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
            io.verbose("--host.getSourceFile: " + fileName);
            var fullName = io.abs(fileName);
            if (fullName in sourceFileCache) {
                var chechedSourceFile = sourceFileCache[fullName];
                var newMtime = _fs.statSync(fullName).mtime.getTime();
                if (chechedSourceFile.mtime !== newMtime) {
                    delete sourceFileCache[fullName];
                }
                else {
                    io.verbose("  cache");
                    return sourceFileCache[fullName];
                }
            }
            try {
                var text = io.readFile(fileName, options.tsOpts.charset);
            }
            catch (e) {
                if (onError) {
                    onError(e.message);
                }
                text = "";
            }
            var result = createSourceFile(fileName, text, languageVersion, "0");
            if (result) {
                sourceFileCache[fullName] = result;
                newSourceFiles[fullName] = result;
            }
            io.verbose("  create");
            return result;
        }
        function writeFile(fileName, data, writeByteOrderMark, onError) {
            io.verbose("--host.writeFile: " + fileName);
            var fullName = io.abs(fileName);
            if (!options.singleFile) {
                var tsFile = fullName.replace(/\.js\.map$/, ".ts").replace(/\.js$/, ".ts");
                if (!(tsFile in newSourceFiles)) {
                    tsFile = fullName.replace(/\.d\.ts$/, ".ts");
                    if (!(tsFile in newSourceFiles)) {
                        io.verbose("  cancel");
                        return;
                    }
                }
            }
            //出力先ディレクトリのパスに変換
            var newFileName = prepareOutputDir(fileName, options, io);
            //map ファイルの参照先パスを変換
            var targetData = prepareSourcePath(fileName, newFileName, data, options);
            try {
                ensureDirectoriesExist(io, GruntTs.util.getDirectoryPath(GruntTs.util.normalizePath(newFileName)));
                //TODO:
                io.writeFile(newFileName, targetData, writeByteOrderMark);
                outputFiles.push(newFileName);
                io.verbose("  write file: " + fileName + " => " + newFileName);
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
            io.verbose("--host.reset");
            if (typeof fileNames === "undefined") {
                sourceFileCache = {};
            }
            if (GruntTs.util.isArray(fileNames)) {
                fileNames.forEach(function (f) {
                    var fullName = io.abs(f);
                    io.verbose("  remove: " + fullName);
                    if (fullName in sourceFileCache) {
                        delete sourceFileCache[fullName];
                    }
                });
            }
            outputFiles.length = 0;
            newSourceFiles = {};
        }
        return {
            getSourceFile: getSourceFile,
            getDefaultLibFilename: function (options) {
                return GruntTs.util.combinePaths(io.binPath(), options.target === 2 /* ES6 */ ? "lib.es6.d.ts" : "lib.d.ts");
            },
            writeFile: writeFile,
            getCurrentDirectory: function () { return GruntTs.util.normalizePath(_path.resolve(".")); },
            useCaseSensitiveFileNames: function () { return useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function () { return _os.EOL; },
            writeResult: writeResult,
            reset: reset,
            io: io
        };
    }
    GruntTs.createCompilerHost = createCompilerHost;
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/typescriptServices.d.ts" />
///<reference path="./option.ts" />
///<reference path="./host.ts" />
///<reference path="./io.ts" />
///<reference path="./watcher.ts" />
var GruntTs;
(function (GruntTs) {
    var Q = require("q"), _path = require("path");
    function execute(grunt, options, host) {
        host.io.verbose("--task.execute");
        host.io.verbose("  options: " + JSON.stringify(options));
        return Q.Promise(function (resolve, reject, notify) {
            if (options.gWatch) {
                watch(grunt, options, host);
            }
            else {
                try {
                    if (compile(options, host)) {
                        resolve(true);
                    }
                    else {
                        reject(false);
                    }
                }
                catch (e) {
                    GruntTs.util.writeAbort(e.message);
                    if (e.stack) {
                        GruntTs.util.writeAbort(e.stack);
                    }
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
            return runTask(grunt, host, watchOpt.before).then(function () {
                if (!recompile(options, host, files)) {
                    //失敗だった場合はリセット
                    host.reset(files);
                }
                return runTask(grunt, host, watchOpt.after);
            }).then(function () {
                writeWatching(watchPath);
            });
        };
        if (watchOpt.atBegin) {
            startCompile().finally(function () {
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
        host.io.verbose("--task.recompile");
        host.reset(updateFiles);
        return compile(options, host);
    }
    function compile(options, host) {
        host.io.verbose("--task.compile");
        var start = Date.now(), defaultLibFilename = host.getDefaultLibFilename(options.tsOpts), targetFiles = getTargetFiles(options, host);
        if (options._showNearlyTscCommand) {
            writeNearlyTscCommand(targetFiles, options);
        }
        var program = ts.createProgram(targetFiles, options.tsOpts, host), errors = program.getDiagnostics();
        if (writeDiagnostics(errors)) {
            return false;
        }
        var checker = program.getTypeChecker(true);
        //errors = checker.getGlobalDiagnostics();
        //program.getSourceFiles().forEach((sourceFile) => {
        //    if(!options.tsOpts.noLib && sourceFile.filename === defaultLibFilename) {
        //        return;
        //    }
        //    errors.push.apply(errors, checker.getDiagnostics(sourceFile)); //.filter(d => d.file === sourceFile);
        //});
        errors = checker.getDiagnostics();
        var isEmitBlocked = checker.isEmitBlocked();
        if (writeDiagnostics(errors, !isEmitBlocked)) {
            if (!!isEmitBlocked) {
                return false;
            }
        }
        errors.length = 0;
        errors = checker.emitFiles().diagnostics;
        if (writeDiagnostics(errors)) {
            return false;
        }
        host.writeResult(Date.now() - start);
        return true;
    }
    function getTargetFiles(options, host) {
        host.io.verbose("--task.getTargetFiles");
        var codeFiles = options.targetFiles(), libFiles = options.references();
        host.io.verbose("  external libs: " + JSON.stringify(libFiles));
        return libFiles.concat(codeFiles);
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
    function runTask(grunt, host, tasks) {
        host.io.verbose("--task.runTask");
        return GruntTs.util.asyncEach(tasks, function (task, index, next) {
            host.io.verbose("  external task start: " + task);
            grunt.util.spawn({
                grunt: true,
                args: [task].concat(grunt.option.flags()),
                opts: { stdio: 'inherit' }
            }, function (err, result, code) {
                host.io.verbose("external task end: " + task);
                next();
            });
        });
    }
    function writeNearlyTscCommand(targetFiles, options) {
        try {
            var strs = [];
            strs.push("tsc");
            if (options.tsOpts.declaration) {
                strs.push("-d");
            }
            if (options.tsOpts.sourceMap) {
                strs.push("--sourceMap");
            }
            if (options.tsOpts.module) {
                strs.push("-m");
                strs.push(options.tsOpts.module === 1 /* CommonJS */ ? "commonjs" : "amd");
            }
            if (options.tsOpts.target) {
                strs.push("-t");
                strs.push(options.tsOpts.target === 0 /* ES3 */ ? "es3" : "es5");
            }
            if (options.tsOpts.noImplicitAny) {
                strs.push("--noImplicitAny");
            }
            if (options.tsOpts.noLib) {
                strs.push("--noLib");
            }
            if (options.tsOpts.noResolve) {
                strs.push("--noResolve");
            }
            if (options.tsOpts.removeComments) {
                strs.push("--removeComments");
            }
            if (options.tsOpts.preserveConstEnums) {
                strs.push("--preserveConstEnums");
            }
            if (options.tsOpts.noEmitOnError) {
                strs.push("--noEmitOnError");
            }
            if (options.singleFile) {
                strs.push("--out");
                strs.push(options.tsOpts.out);
            }
            GruntTs.util.writeInfo(strs.concat(targetFiles).join(" "));
        }
        catch (e) {
        }
    }
})(GruntTs || (GruntTs = {}));
///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/typescriptServices.d.ts" />
///<reference path="./option.ts" />
///<reference path="./host.ts" />
///<reference path="./task.ts" />
///<reference path="./io.ts" />
module.exports = function (grunt) {
    var _path = require("path"), _vm = require('vm'), _os = require('os'), Q = require('q');
    function getTsBinPathWithLoad() {
        var typeScriptBinPath = _path.dirname(require.resolve("typescript")), ts = require(_path.resolve(typeScriptBinPath, "typescriptServices.js"));
        global.ts = ts;
        return typeScriptBinPath;
        //var typeScriptBinPath = _path.dirname(require.resolve("typescript")),
        //    typeScriptPath = _path.resolve(typeScriptBinPath, "tsc.js"),
        //    code: string;
        //
        //if (!typeScriptBinPath) {
        //    grunt.fail.warn("tsc.js not found. please 'npm install typescript'.");
        //    return "";
        //}
        //
        //code = grunt.file.read(typeScriptPath).toString().trim();
        //
        ////末尾にあるコマンドラインの実行行を削除 "ts.executeCommandLine(sys.args);"
        ////code = code.substr(0, code.trim().length - 32);
        ////ts.executeCommandLine(ts.sys.args);
        //////# sourceMappingURL=file:////Users/maru/work/git/TypeScript/built/local/tsc.js.map
        //
        //var lines = code.split(/\n/);
        //var pruneLength = 0;
        //if(lines[lines.length - 1].trim().match("^//")){
        //    pruneLength = lines[lines.length - 1].length + 1;
        //    lines.length = lines.length - 1;
        //}
        //pruneLength += lines[lines.length - 1].length + 1;
        //
        //code = code.substr(0, code.length - pruneLength);
        //
        //_vm.runInThisContext(code, typeScriptPath);
        //
        //return typeScriptBinPath;
    }
    grunt.registerMultiTask("typescript", "Compile typescript to javascript.", function () {
        var self = this, done = self.async(), promises, binPath = getTsBinPathWithLoad();
        promises = self.files.map(function (gruntFile) {
            var io = GruntTs.createIO(grunt, binPath), opt = GruntTs.createGruntOptions(self.options({}), grunt, gruntFile, io), host = GruntTs.createCompilerHost(opt, io);
            return GruntTs.execute(grunt, opt, host);
        });
        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
};
