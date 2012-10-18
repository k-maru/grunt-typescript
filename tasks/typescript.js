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
            console.log(filepath);
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

        var outfile = {
            Write:function (s) {
            },
            WriteLine:function (s) {
            },
            Close:function () {
            }
        };
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
        var io = gruntIO(gruntPath, destPath, basePath);
        var compiler = new ts.TypeScriptCompiler(io.createFile, outerr, undefined, setting);
        compiler.addUnit("" + fs.readFileSync(libDPath), libDPath, false);
        srces.forEach(function (src) {

            compiler.addUnit("" + grunt.file.read(src), path.resolve(gruntPath, src), false);
        });

        compiler.typeCheck();
        compiler.emit(true, io.createFile);
        outerr.Close();

        return true;
    });
};
