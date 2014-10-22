///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />

///<reference path="./util.ts" />

module GruntTs {

    var _path: any = require("path"),
        _fs: any = require("fs");

    export interface GruntWatchOptions{
        path: string;
        after: string[];
        before: string[];
        atBegin: boolean;
    }

    export interface GruntOptions extends ts.CompilerOptions{
        targetFiles(): string[];
        dest: string;
        singleFile: boolean;
        basePath: string;
        ignoreError?: boolean;
        gWatch?: GruntWatchOptions;
    }


    function prepareBasePath(opt: any): string{
        var result: string = "";
        if(util.isStr(opt.basePath)){
            result = opt.basePath;
        }
        if(!result){
            return undefined;
        }
        result = ts.normalizePath(result);
        if(result.lastIndexOf("/") !== result.length - 1){
            result = result + "/";
        }
        return result;
    }

    function prepareRemoveComments(opt: any): boolean{
        var result: boolean = undefined;
        if(!util.isUndef(opt.comment)){
            util.writeWarn("The 'comment' option will be obsolated. Please use the 'removeComments'. (default false)");
        }
        if(!util.isUndef(opt.removeComments)){
            result = !!opt.removeComments;
        }else if(!util.isUndef(opt.comment)){
            result = !opt.comment;
        }
        return result;
    }

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
                    return ts.normalizePath(_path.resolve(_path.dirname(file)));
                });
            },
            extractPath = (files: string[]): string => {
                var dirNames: string[] = getDirNames(files);
                return dirNames.reduce<string>((prev, curr) => {
                    if(!prev){
                        return curr;
                    }
                    var left =  ts.normalizePath(_path.relative(prev, curr)),
                        right = ts.normalizePath(_path.relative(curr, prev)),
                        match = left.match(/^(\.\.(\/)?)+/);
                    if(match){
                        return ts.normalizePath(_path.resolve(prev, match[0]));
                    }
                    match = right.match(/^(\.\.\/)+/);
                    if(match){
                        return ts.normalizePath( _path.resolve(curr, match[0]));
                    }
                    return prev;
                }, undefined);
            };

        if(!opt){
            return undefined;
        }
        if(util.isStr(opt)){
            return {
                path: (opt + ""),
                after: [],
                before: [],
                atBegin: false
            };
        }
        if(util.isBool(opt) && !!opt){
            return {
                path: extractPath(files),
                after: [],
                before: [],
                atBegin: false
            }
        }
        if(!opt.path){
            opt.path = extractPath(files);
            if(!opt.path){
                util.writeWarn("Can't auto detect watch directory. Please place one or more files or set the path option.");
                return undefined;
            }
        }
        if(opt.after && !util.isArray(opt.after)){
            after.push(<string>opt.after);
        }else if(util.isArray(opt.after)){
            after = opt.after;
        }

        if(opt.before && !util.isArray(opt.before)){
            before.push(<string>opt.before);
        }else if(util.isArray(opt.before)){
            before = opt.before;
        }
        return {
            path: opt.path,
            after:  after,
            before: before,
            atBegin: !!opt.atBegin
        };
    }


    export function createGruntOptions(source: any, grunt: IGrunt, gruntFile: grunt.file.IFileMap) : GruntOptions {

        function getTargetFiles(): string[]{
            return grunt.file.expand(<string[]>gruntFile.orig.src);
        }

        function boolOrUndef(source: any, key: string): boolean{
            return util.isUndef(source[key]) ? undefined : !!source[key];
        }

        var dest = ts.normalizePath(gruntFile.dest || ""),
            singleFile = !!dest && _path.extname(dest) === ".js";

        //if(source.watch){
        //    util.writeWarn("The 'watch' option is not implemented yet. However, I will implement soon.");
        //}
        if(source.newLine || source.indentStep || source.useTabIndent || source.disallowAsi){
            util.writeWarn("The 'newLine', 'indentStep', 'useTabIndent' and 'disallowAsi' options is not implemented. It is because a function could not be accessed with a new compiler or it was deleted.");
        }

        return {
            removeComments: prepareRemoveComments(source),
            sourceMap: boolOrUndef(source, "sourceMap"),
            declaration: boolOrUndef(source, "declaration"),
            targetFiles: getTargetFiles,
            dest: dest,
            singleFile: singleFile,
            basePath: prepareBasePath(source),
            target: prepareTarget(source),
            module: prepareModule(source),
            out: singleFile ? dest : undefined,
            noLib: boolOrUndef(source, "noLib"),
            noImplicitAny: boolOrUndef(source, "noImplicitAny"),
            noResolve: boolOrUndef(source, "noResolve"),
            ignoreError: boolOrUndef(source, "ignoreError"),
            gWatch: prepareWatch(source, getTargetFiles())
        };
    }
}