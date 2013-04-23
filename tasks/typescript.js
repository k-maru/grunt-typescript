/*
 * grunt-typescript
 * Copyright 2012 Kazuhide Maruyama
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {

    var path = require('path'),
        fs = require('fs'),
        vm = require('vm'),
        gruntIO = function (currentPath, destPath, basePath, compSetting, outputOne) {
            var createdFiles = [];

            return {
                getCreatedFiles:function () {
                    return createdFiles;
                },

                resolvePath:path.resolve,
                readFile:function (file){
                    var content = grunt.file.read(file);
                    // strip UTF BOM
                    if(content.charCodeAt(0) === 0xFEFF){
                        content = content.slice(1);
                    }

                    return content;
                },
                dirName:path.dirname,

                createFile:function (writeFile, useUTF8) {
                    //console.log("writeFile = " + writeFile + ", destPath = " + destPath + ", basePath = " + basePath + ", output one = " + outputOne);
                    var source = "";
                    return {
                        Write:function (str) {
                            source += str;
                        },
                        WriteLine:function (str) {
                            source += str + grunt.util.linefeed;
                        },
                        Close:function () {
                            if (source.trim().length < 1) {
                                return;
                            }
                            if(!outputOne){
                                if(basePath){
                                    writeFile = writeFile.substr(basePath.length);
                                    if(writeFile.charAt(0) === "/" || writeFile.charAt(0) === "\\"){
                                        writeFile = writeFile.substr(1);
                                    }
                                }
                                if(destPath){
                                    writeFile = path.join(destPath, writeFile);
                                }
                            }

                            grunt.file.write(writeFile, source);
                            createdFiles.push(writeFile);
                        }
                    }
                },
                findFile: function (rootPath, partialFilePath) {
                    var file = path.join(rootPath, partialFilePath);
                    while(true) {
                        if(fs.existsSync(file)) {
                            try  {
                                var content = grunt.file.read(file);
                                // strip UTF BOM
                                if(content.charCodeAt(0) === 0xFEFF){
                                    content = content.slice(1);
                                }
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
                },
                directoryExists:function (path) {
                    return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
                },
                fileExists:function (path) {
                    return fs.existsSync(path);
                },
                stderr:{
                    Write:function (str) {
                        grunt.log.error(str);
                    },
                    WriteLine:function (str) {
                        grunt.log.error(str);
                    },
                    Close:function () {
                    }
                }
            }
        },
        resolveTypeScriptBinPath = function (currentPath, depth) {
            var targetPath = path.resolve(__dirname,
                (new Array(depth + 1)).join("../../"),
                "../node_modules/typescript/bin");
            if (path.resolve(currentPath, "node_modules/typescript/bin").length > targetPath.length) {
                return;
            }
            if (fs.existsSync(path.resolve(targetPath, "typescript.js"))) {
                return targetPath;
            }

            return resolveTypeScriptBinPath(currentPath, ++depth);
        },
        pluralizeFile = function (n) {
            if (n === 1) {
                return "1 file";
            }
            return n + " files";
        };

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var that = this;

        this.files.forEach(function (f) {
            var dest = f.dest,
                options = that.options(),
                extension = that.data.extension,
                files = [];

            grunt.file.expand(f.src).forEach(function (filepath) {
                if (filepath.substr(-5) === ".d.ts") {
                    return;
                }
                files.push(filepath);
            });

            compile(files, dest, grunt.util._.clone(options), extension);
            if (grunt.task.current.errorCount) {
                return false;
            }
        });

        if (grunt.task.current.errorCount) {
            return false;
        }
    });

    var compile = function (srces, destPath, options, extension) {
        var currentPath = path.resolve("."),
            basePath = options.base_path,
            typeScriptBinPath = resolveTypeScriptBinPath(currentPath, 0),
            typeScriptPath = path.resolve(typeScriptBinPath, "typescript.js"),
            libDPath = path.resolve(typeScriptBinPath, "lib.d.ts"),
            outputOne = !!destPath && path.extname(destPath) === ".js";

        if (!typeScriptBinPath) {
            grunt.fail.warn("typescript.js not found. please 'npm install typescript'.");
            return false;
        }

        var code = grunt.file.read(typeScriptPath);
        vm.runInThisContext(code, typeScriptPath);

        var setting = new TypeScript.CompilationSettings();
        var io = gruntIO(currentPath, destPath, basePath, setting, outputOne);
        var env = new TypeScript.CompilationEnvironment(setting, io);
        var resolver = new TypeScript.CodeResolver(env);

        if (options) {
            if (options.target) {
                var target = options.target.toLowerCase();
                if (target === 'es3') {
                    setting.codeGenTarget = 0; //TypeScript.CodeGenTarget.ES3;
                } else if (target == 'es5') {
                    setting.codeGenTarget = 1; //TypeScript.CodeGenTarget.ES5;
                }
            }
//            if (options.style) {
//                setting.setStyleOptions(options.style);
//            }
            if (options.module) {
                var module = options.module.toLowerCase();
                if (module === 'commonjs' || module === 'node') {
                    //TypeScript.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
                    setting.moduleGenTarget = 0;
                } else if (module === 'amd') {
                    //TypeScript.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;
                    setting.moduleGenTarget = 1;
                }
            }
            if (options.sourcemap) {
                setting.mapSourceFiles = options.sourcemap;
            }
            //if (options.declaration_file || options.declaration) {
            if (options.declaration) {
                setting.generateDeclarationFiles = true;
//                if (options.declaration_file) {
//                    grunt.log.writeln("'declaration_file' option now obsolate. use 'declaration' option".yellow);
//                }
            }
            if (options.comments) {
                setting.emitComments = true;
            }
        }
        if (outputOne) {
            destPath = path.resolve(currentPath, destPath);
            setting.outputOption = destPath;
        }

        var units = [
            {
                fileName:libDPath,
                code:grunt.file.read(libDPath)
            }
        ];
        var compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), setting, null);
            //new TypeScript.TypeScriptCompiler(io.stderr, new TypeScript.NullLogger(), setting),
            resolutionDispatcher = {
                postResolutionError:function (errorFile, line, col, errorMessage) {
                    io.stderr.Write(errorFile + "(" + line + "," + col + ") " + (errorMessage == "" ? "" : ": " + errorMessage));
                    compiler.errorReporter.hasErrors = true;
                },
                postResolution:function (path, code) {
                    if (!units.some(function (u) {
                        return u.fileName === path;
                    })) {
                        units.push({fileName:path, code:code.content});
                    }
                }
            };
        var sources = [libDPath];
        sources.push.apply(sources, srces);
        sources.forEach(function(src){
            var unit = new TypeScript.SourceUnit(src, null);
            unit.content = grunt.file.read(src);
            unit.referencedFiles = TypeScript.getReferencedFiles(src, unit);

            compiler.addSourceUnit(unit.path, TypeScript.ScriptSnapshot.fromString(unit.content), 0, false, unit.referencedFiles);
        });

        compiler.pullTypeCheck();

        var emitterIOHost = {
            createFile: function (fileName, useUTF8) {
                return io.createFile(fileName, useUTF8);
            },
            directoryExists: io.directoryExists,
            fileExists: io.fileExists,
            resolvePath: io.resolvePath
        };
        var inputOutput = new TypeScript.StringHashTable();
        var mapInputToOutput = function (inputFile, outputFile) {
            inputOutput.addOrUpdate(inputFile, outputFile);
        };

        compiler.emitAll(emitterIOHost, mapInputToOutput);

        //var emitDeclarationsDiagnostics = compiler.emitAllDeclarations();
        compiler.emitAllDeclarations();

        var result = {js:[], m:[], d:[], other:[]};
        io.getCreatedFiles().forEach(function (item) {
            var file = item.substr(currentPath.length + 1);
            if (/\.js$/.test(file)) result.js.push(file);
            else if (/\.js\.map$/.test(file)) result.m.push(file);
            else if (/\.d\.ts$/.test(file)) result.d.push(file);
            else result.other.push(file);
        });
        var resultMessage = "js: " + pluralizeFile(result.js.length)
            + ", map: " + pluralizeFile(result.m.length)
            + ", declaration: " + pluralizeFile(result.d.length);
        if (outputOne) {
            if(result.js.length > 0){
                grunt.log.writeln("File " + (result.js[0]).cyan + " created.");
            }
            grunt.log.writeln(resultMessage);
        } else {
            grunt.log.writeln(pluralizeFile(io.getCreatedFiles().length).cyan + " created. " + resultMessage);
        }
        return true;
    };
};
