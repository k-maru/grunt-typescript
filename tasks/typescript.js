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
                createFile:function (writeFile) {
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
                            if(basePath){
                                var g = path.join(gruntPath, basePath);
                                writeFile = writeFile.substr(g.length);
                                writeFile = path.join(gruntPath, destPath, writeFile);
                            }

                            grunt.file.write(writeFile, source);
                        }
                    }
                }
            }
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

        var typeScriptPath = path.resolve(__dirname, '../node_modules/typescript/bin/typescript.js'),
            gruntPath = path.resolve("."),
            basePath = options.base_path;

        if (!ts) {
            var code = fs.readFileSync(typeScriptPath);
            vm.runInThisContext(code, typeScriptPath);
            ts = TypeScript;
        }

        var outfile = {
            Write:function (s) {
            },
            WriteLine:function (s) {
            },
            Close:function () {
            }
        };
        var outerr = {
            Write:function (s) {
            },
            WriteLine:function (s) {
            },
            Close:function () {
            }
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
        var io = gruntIO(gruntPath, destPath, basePath);
        var compiler = new ts.TypeScriptCompiler(io.createFile, outerr, undefined, setting);
        compiler.addUnit("" + fs.readFileSync(path.resolve(__dirname, '../node_modules/typescript/bin/lib.d.ts')),
            path.resolve(__dirname, '../node_modules/typescript/bin/lib.d.ts'), false);
        srces.forEach(function (src) {
            compiler.addUnit("" + grunt.file.read(src), path.resolve(gruntPath, src), false);
        });

        compiler.typeCheck();
        compiler.emit(true, io.createFile);

        return true;
    });
};
