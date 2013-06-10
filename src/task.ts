///<reference path="compiler.ts" />

declare var module: any;
module.exports = function(grunt: any){

    var _path = require("path"),
        _vm = require('vm'),
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
        };

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var self = this,
            typescriptBinPath = loadTypeScript();

        this.files.forEach(function (file) {
            var dest: string = file.dest,
                options: any = self.options(),
                files: string[] = [];

            grunt.file.expand(file.src).forEach(function (file: string) {
                if (file.substr(-5) === ".d.ts") {
                    return;
                }
                files.push(file);
            });

            options.outputOne = !!dest && _path.extname(dest) === ".js";

            (new GruntTs.Compiler(grunt, typescriptBinPath)).compile(files, dest, options);

            //compile(files, dest, grunt.util._.clone(options), extension);
        });

        if (grunt.task.current.errorCount) {
            return false;
        }
    });

};