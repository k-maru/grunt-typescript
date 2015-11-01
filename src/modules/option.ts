///<reference path="../../typings/grunt.d.ts" />
///<reference path="./task.ts" />

import * as util from "./util";
import * as ts from "typescript";
import * as gts from "./task";

let _path: NodeJS.Path = require("path"),
    _fs: NodeJS.FileSystem = require("fs");

function prepareWatch(opt: any, files: string[]): gts.WatchOptions{
    let after: string[] = [],
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
            let dirNames: string[] = getDirNames(files),
                result = dirNames.reduce<string>((prev, curr) => {
                    if(!prev){
                        return curr;
                    }
                    let left =  util.normalizePath(_path.relative(prev, curr)),
                        right = util.normalizePath(_path.relative(curr, prev)),
                        match = left.match(/^(\.\.(\/)?)+/);
                    if(match){
                        return util.normalizePath(_path.resolve(prev, match[0]));
                    }
                    match = right.match(/^(\.\.(\/)?)+/);
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
            //util.writeWarn("Can't auto detect watch directory. Please place one or more files or set the path option.");
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


function checkBasePath(opt: any): string{

    if(util.isUndef(opt.basePath)){
        return;
    }

    let result: string = "";

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

    util.writeWarn("BasePath option has been deprecated. Method for determining an output directory has been changed in the same way as the TSC. " +
                   "Please re-set output directory with the new rootDir option or use keepDirectoryHierachy option. " +
                   "However, keepDirectoryHierachy option would not be available long.")
    return result;
}


function prepareTarget(opt: any): ts.ScriptTarget{
    let result:ts.ScriptTarget = ts.ScriptTarget.ES3;
    if (opt.target) {
        let temp = (opt.target + "").toLowerCase();
        if (temp === 'es3') {
            result = ts.ScriptTarget.ES3;
        } else if (temp == 'es5') {
            result = ts.ScriptTarget.ES5;
        } else if(temp == "es6") {
            result = ts.ScriptTarget.ES6;
        }
    }
    return result;
}

function prepareModule(opt: any): ts.ModuleKind {
    let result:ts.ModuleKind = ts.ModuleKind.None;
    if (opt.module) {
        let temp = (opt.module + "").toLowerCase();
        if (temp === "commonjs" || temp === "node") {
            result = ts.ModuleKind.CommonJS;
        } else if (temp === "amd") {
            result = ts.ModuleKind.AMD;
        } else if (temp === "system"){
            result = ts.ModuleKind.System;
        } else if (temp === "umd") {
            result = ts.ModuleKind.UMD;
        }
    }
    return result;
}

function prepareNewLine(opt: any): ts.NewLineKind {
    let result: ts.NewLineKind = undefined;
    if(opt.newLine) {
        let temp = (opt.newLine + "").toLowerCase();
        if(temp === "crlf") {
            result = ts.NewLineKind.CarriageReturnLineFeed;
        }else if(temp === "lf") {
            result = ts.NewLineKind.LineFeed;
        }
    }
    return result;
}

function boolOrUndef(source: any, key: string, def?: boolean): boolean {
    let result = util.isUndef(source[key]) ? undefined : !!source[key];
    if(util.isUndef(result) && !util.isUndef(def)){
        result = def;
    }
    return result;
}

function prepareGenerateTsConfig(opt: any): boolean | string{
    let result = false;
    if(!opt.generateTsConfig){
        return false;
    }
    if(util.isBool(opt.generateTsConfig)){
        return !!opt.generateTsConfig;
    }
    if(util.isStr(opt.generateTsConfig)){
        return opt.generateTsConfig + "";
    }
    return result;
}

function prepareJsx(opt: any): ts.JsxEmit {
    let jsx = (opt.jsx + "").toLowerCase();
    return jsx === "react" ? ts.JsxEmit.React :
           jsx === "preserve" ? ts.JsxEmit.Preserve: undefined;
}

export function createGruntOption(source: any, grunt: IGrunt, gruntFile: grunt.file.IFilesConfig, logger: gts.Logger): gts.CompilerOptions {

    let dest = util.normalizePath(gruntFile.dest || ""),
        singleFile = !!dest && _path.extname(dest) === ".js",
        targetVersion = prepareTarget(source),
        basePath = checkBasePath(source),
        rootDir = util.isStr(source.rootDir) ? source.rootDir : undefined,
        keepDirectoryHierarchy = boolOrUndef(source, "keepDirectoryHierarchy");

    function getTargetFiles(): string[]{
        return <string[]>grunt.file.expand(<string[]>gruntFile.orig.src);
    }
        

    function getReferences(): string[]{
        let target: string[],
            binPath = util.getBinDir();

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
                return util.combinePaths(binPath,
                    targetVersion === ts.ScriptTarget.ES6 ? "lib.core.es6.d.ts" : "lib.core.d.ts");
            }
            if(item === "lib.dom.d.ts" || item === "dom"){
                return util.combinePaths(binPath, "lib.dom.d.ts");
            }
            if(item === "lib.scriptHost.d.ts" || item === "scriptHost"){
                return util.combinePaths(binPath, "lib.scriptHost.d.ts");
            }
            if(item === "lib.webworker.d.ts" || item === "webworker"){
                return util.combinePaths(binPath, "lib.webworker.d.ts");
            }
            return item;
        });
        return grunt.file.expand(target);
    }

    if(keepDirectoryHierarchy){
        rootDir = undefined;
    }else{
        basePath = undefined;
    }

    let result: gts.CompilerOptions = {
        targetFiles: getTargetFiles,
        dest: dest,
        singleFile: singleFile,
        basePath: basePath,
        keepDirectoryHierarchy: keepDirectoryHierarchy,
        watch: prepareWatch(source, getTargetFiles()),
        references: getReferences,
        generateTsConfig: prepareGenerateTsConfig(source),
        tsOptions: {
            removeComments: boolOrUndef(source, "removeComments"),
            sourceMap: boolOrUndef(source, "sourceMap"),
            declaration: boolOrUndef(source, "declaration"),
            out: singleFile ? dest : undefined,
            outDir: singleFile ? undefined:
                    keepDirectoryHierarchy ? undefined: dest,
            noLib: boolOrUndef(source, "noLib"),
            noImplicitAny: boolOrUndef(source, "noImplicitAny"),
            noResolve: boolOrUndef(source, "noResolve"),
            target: targetVersion,
            rootDir: rootDir,
            module: prepareModule(source),
            preserveConstEnums: boolOrUndef(source, "preserveConstEnums"),
            noEmitOnError: boolOrUndef(source, "noEmitOnError", true),
            suppressImplicitAnyIndexErrors: boolOrUndef(source, "suppressImplicitAnyIndexErrors"),
            experimentalDecorators: boolOrUndef(source, "experimentalDecorators"),
            emitDecoratorMetadata: boolOrUndef(source, "emitDecoratorMetadata"),
            newLine: prepareNewLine(source),
            inlineSourceMap: boolOrUndef(source, "inlineSourceMap"),
            inlineSources: boolOrUndef(source, "inlineSources"),
            noEmitHelpers: boolOrUndef(source, "noEmitHelpers"),
            jsx: prepareJsx(source),
            experimentalAsyncFunctions: boolOrUndef(source, "experimentalAsyncFunctions")
        }
    };

    logger.verbose("--option");
    logger.verbose(JSON.stringify(result, null, "  "));

    return result;
}
