///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />

///<reference path="./util.ts" />

module GruntTs {

    var  _path: any = require('path');

    export interface GruntOptions extends ts.CompilerOptions{

        targetFiles(): string[];
        dest: string;
        singleFile: boolean;
        basePath: string;
        ignoreError?: boolean;
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

    export function createGruntOptions(source: any, grunt: IGrunt, gruntFile: grunt.file.IFileMap) : GruntOptions {

        var removeComments:boolean = prepareRemoveComments(source),
            sourceMap:boolean = util.isUndef(source.sourceMap) ? undefined : !!source.sourceMap,
            dest:string = ts.normalizePath(gruntFile.dest || ""),
            singleFile:boolean = !!dest && _path.extname(dest) === ".js",
            basePath:string = prepareBasePath(source),
            target: ts.ScriptTarget = prepareTarget(source),
            module: ts.ModuleKind = prepareModule(source),
            noLib:boolean = util.isUndef(source.noLib) ? undefined : !!source.noLib,
            noImplicitAny:boolean = util.isUndef(source.noImplicitAny) ? undefined : !!source.noImplicitAny,
            noResolve:boolean = util.isUndef(source.noResolve) ? undefined : !!source.noResolve,
            ignoreError: boolean = util.isUndef(source.ignoreError) ? undefined : !!source.ignoreError

        return {
            removeComments: removeComments,
            sourceMap: sourceMap,
            declaration: !!source.declaration,
            targetFiles():string[] {
                return grunt.file.expand(<string[]>gruntFile.orig.src);
            },
            dest: gruntFile.dest,
            singleFile: singleFile,
            basePath: basePath,
            target: target,
            module: module,
            out: singleFile ? dest : undefined,
            noLib: noLib,
            noImplicitAny: noImplicitAny,
            noResolve: noResolve,
            ignoreError: ignoreError
        };
    }
}