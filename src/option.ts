///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/typescriptServices.d.ts" />
///<reference path="./util.ts" />
///<reference path="./io.ts" />

module GruntTs {

    var _path: any = require("path"),
        _fs: any = require("fs");

    export interface GruntWatchOptions{
        path: string[];
        after: string[];
        before: string[];
        atBegin: boolean;
    }

    export interface GruntOptions {
        targetFiles(): string[];
        dest: string;
        singleFile: boolean;
        basePath: string;
        //ignoreError?: boolean;
        gWatch?: GruntWatchOptions;
        references(): string[];
        _showNearlyTscCommand: boolean;
        tsOpts: ts.CompilerOptions;
    }


    function prepareBasePath(opt: any): string{
        var result: string = "";
        if(util.isStr(opt.basePath)){
            result = opt.basePath;
        }
        if(!result){
            return undefined;
        }
        result = util.normalizePath(result);
        if(result.lastIndexOf("/") !== result.length - 1){
            result = result + "/";
        }
        return result;
    }

    //function prepareRemoveComments(opt: any): boolean{
    //    var result: boolean = undefined;
    //    if(!util.isUndef(opt.comment)){
    //        util.writeWarn("The 'comment' option will be obsolated. Please use the 'removeComments'. (default false)");
    //    }
    //    if(!util.isUndef(opt.removeComments)){
    //        result = !!opt.removeComments;
    //    }else if(!util.isUndef(opt.comment)){
    //        result = !opt.comment;
    //    }
    //    return result;
    //}

    function prepareTarget(opt: any): ts.ScriptTarget{
        var result:ts.ScriptTarget = undefined;
        if (opt.target) {
            var temp = (opt.target + "").toLowerCase();
            if (temp === 'es3') {
                result = ts.ScriptTarget.ES3;
            } else if (temp == 'es5') {
                result = ts.ScriptTarget.ES5;
            }
        }
        return result;
    }

    function prepareModule(opt: any): ts.ModuleKind{
        var result:ts.ModuleKind = ts.ModuleKind.None;
        if (opt.module) {
            var temp = (opt.module + "").toLowerCase();
            if (temp === 'commonjs' || temp === 'node') {
                result = ts.ModuleKind.CommonJS;
            } else if (temp === 'amd') {
                result = ts.ModuleKind.AMD;
            }
        }
        return result;
    }

    function prepareWatch(opt: any, files: string[]): GruntWatchOptions{
        var after: string[] = [],
            before: string[] = [],
            val: any = opt.watch,
            getDirNames = (files: string[]): string[] => {
                return files.map<string>(file => {
                    if(_fs.existsSync(file)){
                        if(_fs.statSync(file).isDirectory()){
                            return file;
                        }
                    }else{
                        if(!_path.extname(file)){
                            return file;
                        }
                    }
                    return util.normalizePath(_path.resolve(_path.dirname(file)));
                });
            },
            extractPath = (files: string[]): string[] => {
                var dirNames: string[] = getDirNames(files),
                    result = dirNames.reduce<string>((prev, curr) => {
                        if(!prev){
                            return curr;
                        }
                        var left =  util.normalizePath(_path.relative(prev, curr)),
                            right = util.normalizePath(_path.relative(curr, prev)),
                            match = left.match(/^(\.\.(\/)?)+/);
                        if(match){
                            return util.normalizePath(_path.resolve(prev, match[0]));
                        }
                        match = right.match(/^(\.\.\/)+/);
                        if(match){
                            return util.normalizePath( _path.resolve(curr, match[0]));
                        }
                        return prev;
                    }, undefined);
                if(result){
                    return [result];
                }
            };

        if(!val){
            return undefined;
        }
        if(util.isStr(val) || util.isArray(val)){
            return {
                path: util.isStr(val) ? [<string>val] : <string[]>val,
                after: [],
                before: [],
                atBegin: false
            };
        }
        if(util.isBool(val) && !!val){
            return {
                path: extractPath(files),
                after: [],
                before: [],
                atBegin: false
            }
        }
        if(!val.path){
            val.path = extractPath(files);
            if(!val.path){
                util.writeWarn("Can't auto detect watch directory. Please place one or more files or set the path option.");
                return undefined;
            }
        }
        if(val.after && !util.isArray(val.after)){
            after.push(<string>val.after);
        }else if(util.isArray(val.after)){
            after = val.after;
        }

        if(val.before && !util.isArray(val.before)){
            before.push(<string>val.before);
        }else if(util.isArray(val.before)){
            before = val.before;
        }
        return {
            path: val.path,
            after:  after,
            before: before,
            atBegin: !!val.atBegin
        };
    }

    function prepareExternalLibs(opt: any, io: GruntIO): string[]{
        var target: string[];
        if(!opt.extLibs){
            return [];
        }
        if(util.isStr(opt.extLibs)){
            target = [opt.extLibs];
        }
        if(util.isArray(opt.extLibs)){
            target = opt.extLibs.concat();
        }
        if(!target){
            return [];
        }
        return target.map((item) => {
            if(item === "lib.core.d.ts" || item === "core"){
                return util.combinePaths(io.binPath(), "lib.core.d.ts");
            }
            if(item === "lib.dom.d.ts" || item === "dom"){
                return util.combinePaths(io.binPath(), "lib.dom.d.ts");
            }
            if(item === "lib.scriptHost.d.ts" || item === "scriptHost"){
                return util.combinePaths(io.binPath(), "lib.scriptHost.d.ts");
            }
            if(item === "lib.webworker.d.ts" || item === "webworker"){
                return util.combinePaths(io.binPath(), "lib.webworker.d.ts");
            }
            return item;
        });
    }

    function prepareNoEmitOnError(opt: any): boolean{

        if(!util.isUndef(opt.ignoreError)){
            util.writeWarn("The 'ignoreError' option will be obsolated. Please use the 'noEmitOnError'. (default true)");
        }

        if(util.isUndef(opt.noEmitOnError)){
            if(util.isUndef(opt.ignoreError)){
                return true;
            }
            return !opt.ignoreError;
        }
        return !!opt.noEmitOnError;
    }

    export function createGruntOptions(source: any, grunt: IGrunt, gruntFile: grunt.file.IFileMap, io: GruntIO) : GruntOptions {

        function getTargetFiles(): string[]{
            return <string[]>grunt.file.expand(<string[]>gruntFile.orig.src);
        }

        function boolOrUndef(source: any, key: string): boolean{
            return util.isUndef(source[key]) ? undefined : !!source[key];
        }

        function getReferences(): string[]{
            var target: string[];
            if(!source.references){
                return [];
            }
            if(util.isStr(source.references)){
                target = [source.references];
            }
            if(util.isArray(source.references)){
                target = source.references.concat();
            }
            if(!target){
                return [];
            }
            target = target.map((item) => {
                if(item === "lib.core.d.ts" || item === "core"){
                    return util.combinePaths(io.binPath(), "lib.core.d.ts");
                }
                if(item === "lib.dom.d.ts" || item === "dom"){
                    return util.combinePaths(io.binPath(), "lib.dom.d.ts");
                }
                if(item === "lib.scriptHost.d.ts" || item === "scriptHost"){
                    return util.combinePaths(io.binPath(), "lib.scriptHost.d.ts");
                }
                if(item === "lib.webworker.d.ts" || item === "webworker"){
                    return util.combinePaths(io.binPath(), "lib.webworker.d.ts");
                }
                return item;
            });
            return grunt.file.expand(target);
        }

        var dest = util.normalizePath(gruntFile.dest || ""),
            singleFile = !!dest && _path.extname(dest) === ".js";

        //if(source.newLine || source.indentStep || source.useTabIndent || source.disallowAsi){
        //    util.writeWarn("The 'newLine', 'indentStep', 'useTabIndent' and 'disallowAsi' options is not implemented. It is because a function could not be accessed with a new compiler or it was deleted.");
        //}

        return {
            targetFiles: getTargetFiles,
            dest: dest,
            singleFile: singleFile,
            basePath: prepareBasePath(source),
            //ignoreError: boolOrUndef(source, "ignoreError"),
            gWatch: prepareWatch(source, getTargetFiles()),
            references: getReferences,
            _showNearlyTscCommand: !!grunt.option("showtsc"),
            tsOpts: {
                //removeComments: prepareRemoveComments(source),
                removeComments: boolOrUndef(source, "removeComments"),
                sourceMap: boolOrUndef(source, "sourceMap"),
                declaration: boolOrUndef(source, "declaration"),
                out: singleFile ? dest : undefined,
                noLib: boolOrUndef(source, "noLib"),
                noImplicitAny: boolOrUndef(source, "noImplicitAny"),
                noResolve: boolOrUndef(source, "noResolve"),
                target: prepareTarget(source),
                module: prepareModule(source),
                preserveConstEnums: boolOrUndef(source, "preserveConstEnums"),
                noEmitOnError: prepareNoEmitOnError(source),
                suppressImplicitAnyIndexErrors: boolOrUndef(source, "suppressImplicitAnyIndexErrors")
            }
        };
    }
}
