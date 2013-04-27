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
                stdout:{
                    WriteLine: function(str){
                        grunt.log.writeln(str);
                    }
                },
                stderr:{
                    Write:function (str) {
                        //grunt.log.error(str);
                        grunt.log.error(str);
                    },
                    WriteLine:function (str) {
                        //grunt.log.error(str);
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
        },
        getErrorReporter = function(io, sourceUnits){
            return {
                addDiagnostic: function(diagnostic){
                    var pre = "";
                    if (diagnostic.fileName()) {
                        var diagFileName = diagnostic.fileName().toUpperCase(),
                            targetUnit = sourceUnits.filter(function(unit){
                                return unit.path.toUpperCase() === diagFileName;
                            })[0];
                        if(!targetUnit){
                            targetUnit = new TypeScript.SourceUnit(diagnostic.fileName(), io.readFile(diagnostic.fileName()));
                        }

                        var lineMap = new TypeScript.LineMap(targetUnit.getLineStartPositions(), targetUnit.getLength());
                        var lineCol = { line: -1, character: -1 };
                        lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);
                        pre = diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character + 1) + "): ";
                    }
                    io.stderr.WriteLine(pre + diagnostic.message());
                }
            }
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

        var setting = new TypeScript.CompilationSettings(),
            sourceUnits = [],
            io = gruntIO(currentPath, destPath, basePath, setting, outputOne),
            errorReporter = getErrorReporter(io, sourceUnits),
            env = new TypeScript.CompilationEnvironment(setting, io);

        if (options) {
            if (options.target) {
                var target = options.target.toLowerCase();
                if (target === 'es3') {
                    setting.codeGenTarget = 0; //TypeScript.CodeGenTarget.ES3;
                } else if (target == 'es5') {
                    setting.codeGenTarget = 1; //TypeScript.CodeGenTarget.ES5;
                }
            }
            if (options.module) {
                var module = options.module.toLowerCase();
                if (module === 'commonjs' || module === 'node') {
                    setting.moduleGenTarget = 0;
                } else if (module === 'amd') {
                    setting.moduleGenTarget = 1;
                }
            }
            if (options.sourcemap) {
                setting.mapSourceFiles = options.sourcemap;
            }
            if (options.declaration) {
                setting.generateDeclarationFiles = true;
            }
            if (options.comments) {
                setting.emitComments = true;
            }
        }
        if (outputOne) {
            destPath = path.resolve(currentPath, destPath);
            setting.outputOption = destPath;
        }

        var compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), setting, null);
        var sources = [libDPath];
        var hasError = false;
        sources.push.apply(sources, srces);
        sources.forEach(function(src){

            var unit = new TypeScript.SourceUnit(src, null);
            unit.content = grunt.file.read(src);
            unit.referencedFiles = TypeScript.getReferencedFiles(src, unit);
            sourceUnits.push(unit);

            compiler.addSourceUnit(unit.path, TypeScript.ScriptSnapshot.fromString(unit.content), 0, false, unit.referencedFiles);

            var syntacticDiagnostics = compiler.getSyntacticDiagnostics(unit.path);
            compiler.reportDiagnostics(syntacticDiagnostics, errorReporter);

            if(syntacticDiagnostics.length){
                hasError = true;
            }
        });

        if(hasError){
            return false;
        }

        compiler.pullTypeCheck();

        var fileNames = compiler.fileNameToDocument.getAllKeys();
        for(var i = 0, n = fileNames.length; i < n; i++) {
            var fileName = fileNames[i];
            var semanticDiagnostics = compiler.getSemanticDiagnostics(fileName);
            if (semanticDiagnostics.length > 0) {
                hasError = true;
                compiler.reportDiagnostics(semanticDiagnostics, errorReporter);
            }
        }
        if(hasError){
            return false;
        }

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

        var emitDiagnostics = compiler.emitAll(emitterIOHost, mapInputToOutput);
        compiler.reportDiagnostics(emitDiagnostics, errorReporter);

        var emitDeclarationsDiagnostics = compiler.emitAllDeclarations();
        compiler.reportDiagnostics(emitDeclarationsDiagnostics, errorReporter);

        var result = {js:[], m:[], d:[], other:[]};
        io.getCreatedFiles().forEach(function (item) {
            if (/\.js$/.test(item)) result.js.push(item);
            else if (/\.js\.map$/.test(item)) result.m.push(item);
            else if (/\.d\.ts$/.test(item)) result.d.push(item);
            else result.other.push(item);
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
