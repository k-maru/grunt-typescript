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
        readFile = function(file){
            grunt.verbose.write('Reading ' + file + '...');
            try{
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
                            return new FileInformation(buffer.toString("ucs2", 2), 2 /* Utf16BigEndian */);
                        }
                        break;
                    case 0xFF:
                        if (buffer[1] === 0xFE) {
                            return new FileInformation(buffer.toString("ucs2", 2), 3 /* Utf16LittleEndian */);
                        }
                        break;
                    case 0xEF:
                        if (buffer[1] === 0xBB) {
                            return new FileInformation(buffer.toString("utf8", 3), 1 /* Utf8 */);
                        }
                }
                grunt.verbose.ok();
                return new FileInformation(buffer.toString("utf8", 0), 0 /* None */);
            }catch(e){
                grunt.verbose.fail("CAN'T READ");
                throw e;
            }
        },
        gruntIO = function (currentPath, destPath, basePath, compSetting, outputOne) {
            var createdFiles = [];

            return {
                getCreatedFiles:function () {
                    return createdFiles;
                },

                resolvePath: _path.resolve,
                readFile: function (file){
                    return readFile(file);
                },
                dirName: function (path) {
                    var dirPath = _path.dirname(path);

                    if (dirPath === path) {
                        dirPath = null;
                    }

                    return dirPath;
                },
                writeFile: function (path, contents, writeByteOrderMark) {

                    var created = (function(){
                        var source, type;
                        if (/\.js$/.test(path)) {
                            source = path.substr(0, path.length - 3) + ".ts";
                            type = "js";
                        }
                        else if (/\.js\.map$/.test(path)) {
                            source = path.substr(0, path.length - 7) + ".ts";
                            type = "map";
                        }
                        else if (/\.d\.ts$/.test(path)) {
                            source = path.substr(0, path.length - 5) + ".ts";
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
                    if (contents.trim().length < 1) {
                        return;
                    }
                    if (!outputOne) {
                        var g = _path.join(currentPath, basePath || "");
                        path = path.substr(g.length);
                        path = _path.join(currentPath, destPath ? destPath.toString() : '', path);
                    }
                    if (writeByteOrderMark) {
                        contents = '\uFEFF' + contents;
                    }
                    grunt.file.write(path, contents);
                    created.dest = path;
                    createdFiles.push(created);
                },
                findFile: function (rootPath, partialFilePath) {
                    var file = _path.join(rootPath, partialFilePath);
                    while(true) {
                        if(_fs.existsSync(file)) {
                            try  {
                                var fileInfo = readFile(file);
                                return {
                                    content: fileInfo.contents(),
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
            typeScriptBinPath = loadTypeScript(),
            outputOne = !!destPath && _path.extname(destPath) === ".js",
            setting = createCompilationSettings(options, outputOne),
            io = gruntIO(currentPath, destPath, basePath, setting, outputOne),
            sourceUnits = [],
            errorReporter = getErrorReporter(io, sourceUnits),
            compiler, hasError;

        if (outputOne) {
            destPath = _path.resolve(currentPath, destPath);
            setting.outputOption = destPath;
        }

        compiler = new TypeScript.TypeScriptCompiler(new TypeScript.NullLogger(), setting, null);
        hasError = false;

        //Resolve
        var resolutionResults = TypeScript.ReferenceResolver.resolve(sources, {
            getParentDirectory: function(path){
                return io.dirName(path);
            },
            resolveRelativePath: function (path, directory) {
                var unQuotedPath = TypeScript.stripQuotes(path);
                var normalizedPath;

                if (TypeScript.isRooted(unQuotedPath) || !directory) {
                    normalizedPath = unQuotedPath;
                } else {
                    normalizedPath = IOUtils.combine(directory, unQuotedPath);
                }

                normalizedPath = io.resolvePath(normalizedPath);

                normalizedPath = TypeScript.switchToForwardSlashes(normalizedPath);

                return normalizedPath;
            },
            fileExists: function (path) {
                return io.fileExists(path);
            },
            getScriptSnapshot: function (fileName) {
                var fileInformation;
                try  {
                    fileInformation = io.readFile(fileName);
                } catch (e) {
                    fileInformation = new FileInformation("", 0 /* None */);
                }
                return TypeScript.ScriptSnapshot.fromString(fileInformation.contents());
            }
        }, setting);
        var resolvedFiles = resolutionResults.resolvedFiles;
        if(!options || !options.nolib){
            resolvedFiles = [{
                path: _path.resolve(typeScriptBinPath, "lib.d.ts"),
                referencedFiles: [],
                importedFiles: []
            }].concat(resolvedFiles);
        }

        //compile
        resolvedFiles.forEach(function(resolvedFile){
            //var sourceFile = this.getSourceFile(resolvedFile.path);
            var fileInformation;
            try  {
                fileInformation = io.readFile(resolvedFile.path);
            } catch (e) {
                this.addDiagnostic(new TypeScript.Diagnostic(null, 0, 0, 277 /* Cannot_read_file__0__1 */, [fileName, e.message]));
                fileInformation = new FileInformation("", 0 /* None */);
            }
            var snapshot = TypeScript.ScriptSnapshot.fromString(fileInformation.contents());

            compiler.addSourceUnit(resolvedFile.path, snapshot, fileInformation.byteOrderMark(), 0, false, resolvedFile.referencedFiles);

            var syntacticDiagnostics = compiler.getSyntacticDiagnostics(resolvedFile.path);
            compiler.reportDiagnostics(syntacticDiagnostics, this);

            if (syntacticDiagnostics.length > 0) {
                hasError = true;
            }
        });

        if(hasError){
            return false;
        }
        compiler.pullTypeCheck();

        compiler.fileNameToDocument.getAllKeys().forEach(function(fileName){
            var semanticDiagnostics = compiler.getSemanticDiagnostics(fileName);
            if (semanticDiagnostics.length > 0) {
                hasError = true;
                compiler.reportDiagnostics(semanticDiagnostics, errorReporter);
            }
        });
        if(hasError){
            return false;
        }
        var inputOutput = new TypeScript.StringHashTable();
        var mapInputToOutput = function (inputFile, outputFile) {
            inputOutput.addOrUpdate(inputFile, outputFile);
        };

        var emitDiagnostics = compiler.emitAll(io, mapInputToOutput);
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
