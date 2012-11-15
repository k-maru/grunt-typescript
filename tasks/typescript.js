/*
 * grunt-typescript
 * Copyright 2012 Kazuhide Maruyama
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {
    var path = require('path'),
        fs = require('fs'),
        vm = require('vm'),
        gruntIO = function (gruntPath, destPath, basePath) {
            basePath = basePath || ".";
            return {
                resolvePath: path.resolve,
                readFile: grunt.file.read,
                dirName: path.dirname,

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

                            if(!outputSingle){
                                var g = path.join(gruntPath, basePath);
                                writeFile = writeFile.substr(g.length);
                                writeFile = path.join(gruntPath, destPath, writeFile);
                            }
                            grunt.file.write(writeFile, source);
                        }
                    }
                },
                findFile: function (rootPath, partialFilePath) {

                    var file = path.join(rootPath, partialFilePath);
                    while(true) {
                        if(fs.existsSync(file)) {
                            try  {
                                var content = grunt.file.read(file);
                                return {
                                    content: content,
                                    path: file
                                };
                            } catch (err) {
                            }
                        } else {
                            var parentPath = path.resolve(rootPath, "..");
                            if(rootPath === parentPath) {
                                return null;
                            } else {
                                rootPath = parentPath;
                                file = path.resolve(rootPath, partialFilePath);
                            }
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
        },
        simpleCreateFile = function (writeFile) {
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

                    grunt.file.write(writeFile, source);
                }
            }
        };

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var helpers = require('grunt-lib-contrib').init(grunt);
        var dest = this.file.dest,
            options = helpers.options(this, {}),
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
            grunt.fail.warn("typescript.js not found. please 'npm install typescript'.");
            return false;
        }
        var code = grunt.file.read(typeScriptPath);
        vm.runInThisContext(code, typeScriptPath);

        var outerr = {
            str : "",
            Write:function (s) {
                outerr.str += s;
            },
            WriteLine:function (s) {
                outerr.str += s + "\n";
            },
            Close:function () {
                if (outerr.str.trim()) {
                    grunt.fail.warn("\n" + outerr.str);
                }
            },
        };

        var setting = new TypeScript.CompilationSettings();
        if (options) {
            if (options.target) {
                var target = options.target.toLowerCase();
                if (target === 'es3') {
                    setting.codeGenTarget = TypeScript.CodeGenTarget.ES3;
                } else if (target == 'es5') {
                    setting.codeGenTarget = TypeScript.CodeGenTarget.ES5;
                }
            }
            if (options.style) {
                setting.setStyleOptions(options.style);
            }
            if (options.module) {
                var module = options.module.toLowerCase();
                if (module === 'commonjs' || module === 'node') {
                    TypeScript.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
                } else if (module === 'amd') {
                    TypeScript.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;
                }
            }
            if (options.sourcemap) {
                setting.mapSourceFiles = options.sourcemap;
            }
            if (options.declaration_file) {
                setting.generateDeclarationFiles = options.declaration_file;
            }
        }

        if(path.extname(destPath) === ".js"){
            var originalDestPath = destPath;
            destPath = path.resolve(gruntPath, destPath);
            setting.outputOne(destPath);
        }

        var io = gruntIO(gruntPath, destPath, basePath);
        var env = new TypeScript.CompilationEnvironment(setting, io);
        var resolver = new TypeScript.CodeResolver(env);

        var units = [
            {
                fileName: libDPath,
                code: grunt.file.read(libDPath)
            }
        ];

        var resolutionDispatcher = {
            postResolutionError : function (errorFile, errorMessage) {
                grunt.fail.warn(errorFile + " : " + errorMessage);
            },
            postResolution : function (path, code) {
                if(!units.some(function(u) { return u.fileName === path;})){
                    units.push({fileName: path, code: code.content});
                }
                grunt.verbose.writeln("Compiling " + path.cyan);
            }
        };

        srces.forEach(function(src){
            resolver.resolveCode(path.resolve(gruntPath, src), "", false, resolutionDispatcher);
        });

        var output = setting.outputMany ? null : io.createFile(destPath, true);
        var compiler = new TypeScript.TypeScriptCompiler(
            output, outerr,
            new TypeScript.NullLogger(), setting);

        units.forEach(function(unit) {
            if (!unit.code){
                unit.code = grunt.file.read(unit.fileName);
            }
            compiler.addUnit(unit.code, unit.fileName, false);
        });

        compiler.setErrorOutput(outerr);
        compiler.typeCheck();
        compiler.emit(setting.outputMany, setting.outputMany ? io.createFile : simpleCreateFile);
        if (!setting.outputMany) {
            output.Close();
            grunt.log.writeln('File ' + (originalDestPath ? originalDestPath : destPath).cyan + ' created.');
        }
        outerr.Close();

        return true;
    });
};
