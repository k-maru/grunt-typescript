/*
 * grunt-typescript
 * Copyright 2012 Kazuhide Maruyama
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {
    var path = require('path'),
        fs = require('fs'),
        vm = require('vm'),
        ts;

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var dest = this.file.dest,
            options = this.data.options,
            extension = this.data.extension;

        grunt.file.expandFiles(this.file.src).forEach(function (filepath) {
            if(filepath.substr(-5) === ".d.ts"){
                return;
            }
            grunt.helper('compile', filepath, dest, grunt.utils._.clone(options), extension);
        });

        if (grunt.task.current.errorCount) {
            return false;
        } else {
            return true;
        }
    });

    grunt.registerHelper('compile', function (src, destPath, options, extension) {

        var typeScriptPath = path.resolve(__dirname , '../node_modules/typescript/bin/typescript.js');
        if (!ts) {
            var code = fs.readFileSync(typeScriptPath);
            vm.runInThisContext(code, typeScriptPath);
            ts = TypeScript;
        }

        var outfile = {
            source:'',
            Write:function (s) {
                this.source += s;
            },
            WriteLine:function (s) {
                this.source += s + "\r\n";
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

        if(options && options.module){
            var module = options.module.toLowerCase();
            if(module === 'commonjs' || module === 'node') {
                ts.moduleGenTarget = ts.ModuleGenTarget.Synchronous;
            } else if(module === 'amd') {
                ts.moduleGenTarget = ts.ModuleGenTarget.Asynchronous;
            }
        }

        var setting = new ts.CompilationSettings();
        var compiler = new ts.TypeScriptCompiler(outfile, outerr, undefined, setting);
        compiler.addUnit("" + fs.readFileSync(path.resolve(__dirname, '../node_modules/typescript/bin/lib.d.ts')),
            path.resolve(__dirname, '../node_modules/typescript/bin/lib.d.ts'), false);
        compiler.addUnit("" + grunt.file.read(src), path.resolve(__dirname, '../../../', src), false);

		compiler.typeCheck();
        compiler.emit(false, function () {
            return outfile;
        });

        var ext = path.extname(src);
        var newFile;
        if (ext) {
            newFile = src.substr(0, src.length - ext.length) + ".js";
        } else {
            newFile = src + ".js";
        }
        grunt.file.write(path.join(destPath, newFile), outfile.source);
        return true;

    });
};
