///<reference path="grunt.d.ts" />
///<reference path="io.ts" />
///<reference path="compiler.ts" />

declare var module: any;
module.exports = function(grunt: any){

    var _path = require("path"),
        _vm = require('vm'),
        _os = require('os'),
        getTsBinPathWithLoad = function(){
            var typeScriptBinPath = _path.dirname(require.resolve("typescript")),
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
        prepareBasePath = function(io: GruntTs.GruntIO, path: string): string{
            if(!path){
                return path;
            }
            path = io.normalizePath(path);
            if(path.lastIndexOf("/") !== path.length - 1){
                path = path + "/";
            }
            return path;
        };

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var self = this,
            typescriptBinPath = getTsBinPathWithLoad(),
            hasError: boolean = false;

        this.files.forEach(function (file) {
            var dest: string = file.dest,
                options: any = self.options(),
                files: string[] = [],
                io: GruntTs.GruntIO = new GruntTs.GruntIO(grunt);

            TypeScript.newLine = function(){
                return _os.EOL;
            };
            if(options.newline){

            }

            grunt.file.expand(file.src).forEach(function (file: string) {
                files.push(file);
            });

            dest = io.normalizePath(dest);

            options.outputOne = !!dest && _path.extname(dest) === ".js";

            options.base_path = prepareBasePath(io, <string>options.base_path);
            if(options.base_path){
                options.base_path = io.normalizePath(options.base_path);
            }
            if(typeof options.ignoreTypeCheck === "undefined"){
                options.ignoreTypeCheck = true;
            }

            if(!(new GruntTs.Compiler(grunt, typescriptBinPath, io)).exec(files, dest, options)){
                hasError = true;
            }
        });
        if(hasError){
            return false;
        }
        if (grunt.task.current.errorCount) {
            return false;
        }
    });
};