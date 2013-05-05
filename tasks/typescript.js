/*
 * grunt-typescript
 * Copyright 2013 Kazuhide Maruyama
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {

    "use strict";

    var _path = require('path'),
        _fs = require('fs'),
        _vm = require('vm'),
        gruntIO = function (currentPath, destPath, basePath, compSetting, outputOne) {
            var createdFiles = [];

            return {
                getCreatedFiles:function () {
                    return createdFiles;
                },

                resolvePath: _path.resolve,
                readFile:function (file){
                    var content = grunt.file.read(file);
                    // strip UTF BOM
                    if(content.charCodeAt(0) === 0xFEFF){
                        content = content.slice(1);
                    }

                    return content;
                },
                dirName:_path.dirname,

                createFile:function (writeFile, useUTF8) {
                    var code = "";
                    return {
                        Write:function (str) {
                            code += str;
                        },
                        WriteLine:function (str) {
                            code += str + grunt.util.linefeed;
                        },
                        Close:function () {
                            var created = (function(){
                                var source, type;
                                if (/\.js$/.test(writeFile)) {
                                    source = writeFile.substr(0, writeFile.length - 3) + ".ts";
                                    type = "js";
                                }
                                else if (/\.js\.map$/.test(writeFile)) {
                                    source = writeFile.substr(0, writeFile.length - 7) + ".ts";
                                    type = "map";
                                }
                                else if (/\.d\.ts$/.test(writeFile)) {
                                    source = writeFile.substr(0, writeFile.length - 5) + ".ts";
                                    type = "declaration";
                                }
                                if(outputOne){
                                    source = "";
                                }
                                return {
                                    source: source,
                                    type: type
                                };
                            })();
                            if (code.trim().length < 1) {
                                return;
                            }
                            if (!outputOne) {
                                var g = _path.join(currentPath, basePath || "");
                                writeFile = writeFile.substr(g.length);
                                writeFile = _path.join(currentPath, destPath ? destPath.toString() : '', writeFile);
                            }
                            grunt.file.write(writeFile, code);
                            created.dest = writeFile;
                            createdFiles.push(created);
                        }
                    }
                },
                findFile: function (rootPath, partialFilePath) {
                    var file = _path.join(rootPath, partialFilePath);
                    while(true) {
                        if(_fs.existsSync(file)) {
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
                            var parentPath = _path.resolve(rootPath, "..");
                            if(rootPath === parentPath) {
                                return null;
                            } else {
                                rootPath = parentPath;
                                file = _path.resolve(rootPath, partialFilePath);
                            }
                        }
                    }
                },
                directoryExists:function (path) {
                    return _fs.existsSync(path) && _fs.lstatSync(path).isDirectory();
                },
                fileExists:function (path) {
                    return _fs.existsSync(path);
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
//        resolveTypeScriptBinPath = function (currentPath, depth) {
//            var targetPath = _path.resolve(__dirname,
//                (new Array(depth + 1)).join("../../"),
//                "../node_modules/typescript/bin");
//            if (_path.resolve(currentPath, "node_modules/typescript/bin").length > targetPath.length) {
//                return;
//            }
//            if (_fs.existsSync(_path.resolve(targetPath, "typescript.js"))) {
//                return targetPath;
//            }
//            return resolveTypeScriptBinPath(currentPath, ++depth);
//
//        },
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
        },
        prepareSourceMapPath = function(currentPath, options, createdFiles){
            var useFullPath = options.fullSourceMapPath;

            if(!options.sourcemap){
                return;
            }

            createdFiles.filter(function(item){
                return item.type === "map" || (useFullPath && item.type == "js");
            }).forEach(function(item){
                var mapObj, lines, sourceMapLine;
                if(item.type === "map"){
                    mapObj = JSON.parse(grunt.file.read(item.dest));
                    mapObj.sources.length = 0;
                    mapObj.sources.push(_path.relative(_path.dirname(item.dest), item.source).replace(/\\/g, "/"));
                    if(useFullPath){
                        mapObj.file = "file:///" + (item.dest.substr(0, item.dest.length - 6) + "js").replace(/\\/g, "/");
                    }
                    grunt.file.write(item.dest, JSON.stringify(mapObj))
                }else if(useFullPath && item.type === "js"){
                    lines = grunt.file.read(item.dest).split(grunt.util.linefeed);
                    sourceMapLine = lines[lines.length - 2];
                    if(/^\/\/@ sourceMappingURL\=.+\.js\.map$/.test(sourceMapLine)){
                        lines[lines.length - 2] = "//@ sourceMappingURL=file:///" + item.dest.replace(/\\/g, "/") + ".map";
                        grunt.file.write(item.dest, lines.join(grunt.util.linefeed));
                    }
                }
            });
        },
        loadTypeScript = function(){
            var typeScriptBinPath = _path.dirname(require.resolve("typescript")), //resolveTypeScriptBinPath(currentPath, 0),
                typeScriptPath = _path.resolve(typeScriptBinPath, "typescript.js"),
                code;

            if (!typeScriptBinPath) {
                grunt.fail.warn("typescript.js not found. please 'npm install typescript'.");
                return false;
            }

            code = grunt.file.read(typeScriptPath);
            _vm.runInThisContext(code, typeScriptPath);

            return typeScriptBinPath;
        },
        createCompilationSettings = function(options, outputOne){
            var setting = new TypeScript.CompilationSettings(),
                temp;

            if (options) {
                if (options.target) {
                    temp = options.target.toLowerCase();
                    if (temp === 'es3') {
                        setting.codeGenTarget = 0; //TypeScript.CodeGenTarget.ES3;
                    } else if (temp == 'es5') {
                        setting.codeGenTarget = 1; //TypeScript.CodeGenTarget.ES5;
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
                if (outputOne && options.fullSourceMapPath) {
                    setting.emitFullSourceMapPath = options.fullSourceMapPath;
                }
                if (options.declaration) {
                    setting.generateDeclarationFiles = true;
                }
                if (outputOne && options.fullSourceMapPath) {
                    setting.emitFullSourceMapPath = options.fullSourceMapPath;
                }
                if (options.comments) {
                    setting.emitComments = true;
                }
                //0.9 disallowbool
                if(options.disallowbool){
                    setting.disallowBool = true;
                }
            }
            return setting;
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

    var compile = function (sources, destPath, options, extension) {
        var currentPath = _path.resolve("."),
            basePath = options.base_path,
            typeScriptBinPath = loadTypeScript(), // _path.dirname(require.resolve("typescript")), //resolveTypeScriptBinPath(currentPath, 0),
            outputOne = !!destPath && _path.extname(destPath) === ".js",
            setting = createCompilationSettings(options, outputOne),
            io = gruntIO(currentPath, destPath, basePath, setting, outputOne),
            sourceUnits = [],
            errorReporter = getErrorReporter(io, sourceUnits),
            compiler, hasError;

        if(!options || !options.nolib){
            sources.unshift(_path.resolve(typeScriptBinPath, "lib.d.ts"));
        }
        if (outputOne) {
            destPath = _path.resolve(currentPath, destPath);
            setting.outputOption = destPath;
        }

        compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), setting, null);
        hasError = false;

        sources.forEach(function(src){
            var fullPath = _path.resolve(currentPath, src);
            var unit = new TypeScript.SourceUnit(fullPath, null);
            
            unit.content = grunt.file.read(src);
            if(options.declaration){
                //unit.referencedFiles = TypeScript.getReferencedFiles(src, unit);
                unit.referencedFiles = TypeScript.preProcessFile(fullPath,  unit, undefined, false);
            }

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

        if(!outputOne){
            prepareSourceMapPath(currentPath, options, io.getCreatedFiles());
        }
        
        var result = {js:[], m:[], d:[], other:[]};
        io.getCreatedFiles().forEach(function (item) {
            if (item.type === "js") result.js.push(item.dest);
            else if (item.type === "map") result.m.push(item.dest);
            else if (item.type === "declaration") result.d.push(item.dest);
            else result.other.push(item.dest);
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
