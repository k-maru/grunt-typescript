///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/typescriptServices.d.ts" />

///<reference path="./option.ts" />
///<reference path="./host.ts" />
///<reference path="./task.ts" />
///<reference path="./io.ts" />

declare var module: any;
declare var require: any;

module.exports = function(grunt: IGrunt){

    var _path = require("path"),
        _vm = require('vm'),
        _os = require('os'),
        Q = require('q');

    function getTsBinPathWithLoad(): string{

        var typeScriptBinPath = _path.dirname(require.resolve("typescript")),
            ts = require(_path.resolve(typeScriptBinPath, "typescriptServices.js"));
        global.ts = ts;
        return typeScriptBinPath;
        //var typeScriptBinPath = _path.dirname(require.resolve("typescript")),
        //    typeScriptPath = _path.resolve(typeScriptBinPath, "tsc.js"),
        //    code: string;
        //
        //if (!typeScriptBinPath) {
        //    grunt.fail.warn("tsc.js not found. please 'npm install typescript'.");
        //    return "";
        //}
        //
        //code = grunt.file.read(typeScriptPath).toString().trim();
        //
        ////末尾にあるコマンドラインの実行行を削除 "ts.executeCommandLine(sys.args);"
        ////code = code.substr(0, code.trim().length - 32);
        ////ts.executeCommandLine(ts.sys.args);
        //////# sourceMappingURL=file:////Users/maru/work/git/TypeScript/built/local/tsc.js.map
        //
        //var lines = code.split(/\n/);
        //var pruneLength = 0;
        //if(lines[lines.length - 1].trim().match("^//")){
        //    pruneLength = lines[lines.length - 1].length + 1;
        //    lines.length = lines.length - 1;
        //}
        //pruneLength += lines[lines.length - 1].length + 1;
        //
        //code = code.substr(0, code.length - pruneLength);
        //
        //_vm.runInThisContext(code, typeScriptPath);
        //
        //return typeScriptBinPath;
    }

    grunt.registerMultiTask("typescript", "Compile typescript to javascript.", function () {

        var self: grunt.task.IMultiTask<{src: string;}> = this,
            done = self.async(),
            promises: Q.Promise<any>[],
            binPath = getTsBinPathWithLoad();

        promises = self.files.map(function(gruntFile: grunt.file.IFileMap){
            var io = GruntTs.createIO(grunt, binPath),
                opt = GruntTs.createGruntOptions(self.options({}), grunt, gruntFile, io),
                host = GruntTs.createCompilerHost(opt, io);
            return GruntTs.execute(grunt, opt, host);
        });
        Q.all(promises).then(function(){
            done();
        }, function(){
            done(false);
        });
    });
};
