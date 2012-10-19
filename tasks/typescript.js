/*
 * grunt-typescript
 * Copyright 2012 Kazuhide Maruyama
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {
    var path = require('path'),
        fs = require('fs'),
        vm = require('vm'),
        ts,
        gruntIO = function (gruntPath, destPath, basePath) {
            return {
                createFile:function (writeFile, outputSingle) {
                    var source = "";

                    return {
                        Write:function (str) {
                            source += str;
                        },
                        WriteLine:function (str) {
                            source += str + grunt.utils.linefeed;
                        },
                        Close:function () {

                            if (source.trim().length < 1) {
                                return;
                            }

                            if(basePath && !outputSingle){
                                var g = path.join(gruntPath, basePath);
                                writeFile = writeFile.substr(g.length);
                                writeFile = path.join(gruntPath, destPath, writeFile);
                            }

                            grunt.file.write(writeFile, source);
                        }
                    }
                }
            }
        },
        resolveTypeScriptBinPath = function(gruntPath, depth){
        	var targetPath = path.resolve(__dirname,
        			(new Array(depth + 1)).join("../../"),
        			"../node_modules/typescript/bin");
        	if(path.resolve(gruntPath, "node_modules/typescript/bin").length >
        		targetPath.length){
        		return;
        	}
        	if(fs.existsSync(path.resolve(targetPath, "typescript.js"))){
        		return targetPath;
        	}

        	return resolveTypeScriptBinPath(gruntPath, ++depth);
    	};

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var dest = this.file.dest,
            options = this.data.options,
            extension = this.data.extension,
            files = [];

        grunt.file.expandFiles(this.file.src).forEach(function (filepath) {
            if (filepath.substr(-5) === ".d.ts") {
                return;
            }
            files.push(filepath);
        });

        grunt.helper('compile', files, dest, grunt.utils._.clone(options), extension);

        if (grunt.task.current.errorCount) {
            return false;
        } else {
            return true;
        }
    });

    grunt.registerHelper('compile', function (srces, destPath, options, extension) {

        var gruntPath = path.resolve("."),
            basePath = options.base_path,
            typeScriptBinPath = resolveTypeScriptBinPath(gruntPath, 0),
            typeScriptPath = path.resolve(typeScriptBinPath, "typescript.js"),
            libDPath = path.resolve(typeScriptBinPath, "lib.d.ts");

		if(!typeScriptBinPath){
			throw "typescript.js not found. please 'npm install typescript'.";
		}

        if (!ts) {
            var code = fs.readFileSync(typeScriptPath);
            vm.runInThisContext(code, typeScriptPath);
            ts = TypeScript;
        }

        var outerr = {
            str : "",
            empty: true,
            Write:function (s) {
                outerr.str += s;
                outerr.empty = false;
            },
            WriteLine:function (s) {
                outerr.str += s + "\n";
                outerr.empty = false;
            },
            Close:function () {
                if (!outerr.empty) {
                    grunt.fail.warn("\n" + outerr.str);
                }
            },
        };

        if (options && options.module) {
            var module = options.module.toLowerCase();
            if (module === 'commonjs' || module === 'node') {
                ts.moduleGenTarget = ts.ModuleGenTarget.Synchronous;
            } else if (module === 'amd') {
                ts.moduleGenTarget = ts.ModuleGenTarget.Asynchronous;
            }
        }

        var setting = new ts.CompilationSettings();
        var env = new ts.CompilationEnvironment(setting, getNodeIO());
        if(path.extname(destPath) === ".js"){
        	destPath = path.resolve(gruntPath, destPath);
        	setting.outputOne(destPath);
        }

        var io = gruntIO(gruntPath, destPath, basePath);
        var output = setting.outputMany ? null : io.createFile(destPath, true);
        var compiler = new ts.TypeScriptCompiler(output, outerr, undefined, setting);

        compiler.addUnit("" + fs.readFileSync(libDPath), libDPath, false);

        var resolver = new ts.CodeResolver(env);
        var resolutionDispatcher = {
            sources = {},
            postResolutionError : function (errorFile, errorMessage) {
                 grunt.fail.warn(errorFile + " : " + errorMessage);
            },
            postResolution : function (path, code) {
                if (!sources[path]) {
                    compiler.addSourceUnit(code, path);
                    grunt.verbose.writeln("Compiling " + path.cyan);
                    sources[path] = true;
                }
            }
        };
        srces.forEach(function (src) {
            resolver.resolveCode(src, "", false, resolutionDispatcher);
        });

        compiler.typeCheck();
        compiler.emit(setting.outputMany, setting.outputMany ? io.createFile : null);
        if (!setting.outputMany) {
            output.Close();
        }
        outerr.Close();

        return true;
    });
};

/*
 * From TypeScript/src/compiler/io.ts
 * Needed to resolve dependencies.
 */
function getNodeIO() {
    var _fs = require('fs');
    var _path = require('path');
    var _module = require('module');
    return {
        readFile: function (file) {
            var buffer = _fs.readFileSync(file);
            switch(buffer[0]) {
                case 254: {
                    if(buffer[1] == 255) {
                        var i = 0;
                        while((i + 1) < buffer.length) {
                            var temp = buffer[i];
                            buffer[i] = buffer[i + 1];
                            buffer[i + 1] = temp;
                            i += 2;
                        }
                        return buffer.toString("ucs2", 2);
                    }
                    break;

                }
                case 255: {
                    if(buffer[1] == 254) {
                        return buffer.toString("ucs2", 2);
                    }
                    break;

                }
                case 239: {
                    if(buffer[1] == 187) {
                        return buffer.toString("utf8", 3);
                    }

                }
            }
            return buffer.toString();
        },
        writeFile: _fs.writeFileSync,
        deleteFile: function (path) {
            try  {
                _fs.unlinkSync(path);
            } catch (e) {
            }
        },
        fileExists: function (path) {
            return _fs.existsSync(path);
        },
        createFile: function (path) {
            function mkdirRecursiveSync(path) {
                var stats = _fs.statSync(path);
                if(stats.isFile()) {
                    throw "\"" + path + "\" exists but isn't a directory.";
                } else {
                    if(stats.isDirectory()) {
                        return;
                    } else {
                        mkdirRecursiveSync(_path.dirname(path));
                        _fs.mkdirSync(path, 509);
                    }
                }
            }
            mkdirRecursiveSync(_path.dirname(path));
            var fd = _fs.openSync(path, 'w');
            return {
                Write: function (str) {
                    _fs.writeSync(fd, str);
                },
                WriteLine: function (str) {
                    _fs.writeSync(fd, str + '\r\n');
                },
                Close: function () {
                    _fs.closeSync(fd);
                    fd = null;
                }
            };
        },
        dir: function dir(path, spec, options) {
            options = options || {
            };
            function filesInFolder(folder) {
                var paths = [];
                var files = _fs.readdirSync(folder);
                for(var i = 0; i < files.length; i++) {
                    var stat = _fs.statSync(folder + "\\" + files[i]);
                    if(options.recursive && stat.isDirectory()) {
                        paths = paths.concat(filesInFolder(folder + "\\" + files[i]));
                    } else {
                        if(stat.isFile() && (!spec || files[i].match(spec))) {
                            paths.push(folder + "\\" + files[i]);
                        }
                    }
                }
                return paths;
            }
            return filesInFolder(path);
        },
        createDirectory: function (path) {
            if(!this.directoryExists(path)) {
                _fs.mkdirSync(path);
            }
        },
        directoryExists: function (path) {
            return _fs.existsSync(path) && _fs.lstatSync(path).isDirectory();
        },
        resolvePath: function (path) {
            return _path.resolve(path);
        },
        dirName: function (path) {
            return _path.dirname(path);
        },
        findFile: function (rootPath, partialFilePath) {
            var path = rootPath + "/" + partialFilePath;
            while(true) {
                if(_fs.existsSync(path)) {
                    try  {
                        var content = this.readFile(path);
                        return {
                            content: content,
                            path: path
                        };
                    } catch (err) {
                    }
                } else {
                    var parentPath = _path.resolve(rootPath, "..");
                    if(rootPath === parentPath) {
                        return null;
                    } else {
                        rootPath = parentPath;
                        path = _path.resolve(rootPath, partialFilePath);
                    }
                }
            }
        },
        print: function (str) {
            process.stdout.write(str);
        },
        printLine: function (str) {
            process.stdout.write(str + '\n');
        },
        arguments: process.argv.slice(2),
        stderr: {
            Write: function (str) {
                process.stderr.write(str);
            },
            WriteLine: function (str) {
                process.stderr.write(str + '\n');
            },
            Close: function () {
            }
        },
        watchFiles: function (files, callback) {
            var watchers = [];
            var firstRun = true;
            var isWindows = /^win/.test(process.platform);
            var processingChange = false;
            var fileChanged = function (e, fn) {
                if(!firstRun && !isWindows) {
                    for(var i = 0; i < files.length; ++i) {
                        _fs.unwatchFile(files[i]);
                    }
                }
                firstRun = false;
                if(!processingChange) {
                    processingChange = true;
                    callback();
                    setTimeout(function () {
                        processingChange = false;
                    }, 100);
                }
                if(isWindows && watchers.length === 0) {
                    for(var i = 0; i < files.length; ++i) {
                        var watcher = _fs.watch(files[i], fileChanged);
                        watchers.push(watcher);
                        watcher.on('error', function (e) {
                            process.stderr.write("ERROR" + e);
                        });
                    }
                } else {
                    if(!isWindows) {
                        for(var i = 0; i < files.length; ++i) {
                            _fs.watchFile(files[i], {
                                interval: 500
                            }, fileChanged);
                        }
                    }
                }
            };
            fileChanged();
            return true;
        },
        run: function (source, filename) {
            require.main.filename = filename;
            require.main.paths = _module._nodeModulePaths(_path.dirname(_fs.realpathSync(filename)));
            require.main._compile(source, filename);
        },
        getExecutingFilePath: function () {
            return process.mainModule.filename;
        },
        quit: process.exit
    };
}
