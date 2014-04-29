///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/typescript.d.ts" />
///<reference path="io.ts" />
///<reference path="util.ts" />

module GruntTs{

    var _path = require("path"),
        _fs = require("fs");

    function prepareNewLine(optVal: any): GruntTs.NewLine{
        var val: string;
        if(optVal){
            val = optVal.toString().toUpperCase();
            return val === "CRLF" ? NewLine.crLf :
                   val === "LF" ? NewLine.lf : NewLine.auto;
        }
        return NewLine.auto;
    }

    function prepareIndentStep(optVal: any): number{
        if(Object.prototype.toString.call(optVal) === "[object Number]" && (<number>optVal) > -1 ){
            return <number>optVal;
        }
        return -1;
    }

    function prepareBasePath(opt: any, io: GruntTs.GruntIO): string{
        var optVal: string = "";
        if(util.isStr(opt.base_path)){
            io.writeWarn("The 'base_path' option will be obsoleted. Please use the 'basePath'.");
            optVal = opt.base_path;
        }
        if(util.isStr(opt.basePath)){
            optVal = opt.basePath;
        }

        if(!optVal){
            return undefined;
        }
        optVal = io.normalizePath(optVal);
        if(optVal.lastIndexOf("/") !== optVal.length - 1){
            optVal = optVal + "/";
        }
        //TODO: ほんまにいるかチェック
        return io.normalizePath(optVal);
    }

    function prepareSourceMap(opt: any, io: GruntTs.GruntIO): boolean{
        var optVal: boolean = false;
        if(opt.sourcemap){
            io.writeWarn("The 'sourcemap' option will be obsoleted. Please use the 'sourceMap'. (different casing)");
            optVal = !!opt.sourcemap;
        }
        if(opt.sourceMap){
            optVal = !!opt.sourceMap;
        }
        return optVal;
    }

    function prepareNoLib(opt: any, io: GruntTs.GruntIO): boolean{
        var optVal: boolean = false;
        if(opt.nolib){
            io.writeWarn("The 'nolib' option will be obsoleted. Please use the 'noLib'. (different casing)");
            optVal = !!opt.nolib;
        }
        if(opt.noLib){
            optVal = !!opt.noLib;
        }
        return optVal;
    }

    function checkIgnoreTypeCheck(opt: any, io: GruntTs.GruntIO){
        if(!util.isUndef(opt.ignoreTypeCheck)){
            io.writeWarn("The 'ignoreTypeCheck' option removed. Please use the 'ignoreError'.");
        }
    }

    function prepareIgnoreError(optVal: any): boolean{
        var val = false;
        if(!util.isUndef(optVal)){
            val = !!optVal;
        }
        return val;
    }

    function prepareNoResolve(optVal: any): boolean{
        var val = false;
        if(!util.isUndef(optVal)){
            val = !!optVal;
        }
        return val;
    }

    function prepareTarget(optVal: any): TypeScript.LanguageVersion{
        var val:TypeScript.LanguageVersion = undefined;
        if (optVal.target) {
            var temp = (optVal.target + "").toLowerCase();
            if (temp === 'es3') {
                val = TypeScript.LanguageVersion.EcmaScript3;
            } else if (temp == 'es5') {
                val = TypeScript.LanguageVersion.EcmaScript5;
            }
        }
        return val;
    }

    function prepareModule(optVal: any): TypeScript.ModuleGenTarget{
        var val:TypeScript.ModuleGenTarget = undefined;
        if (optVal.module) {
            var temp = (optVal.module + "").toLowerCase();
            if (temp === 'commonjs' || temp === 'node') {
                val = TypeScript.ModuleGenTarget.Synchronous;
            } else if (temp === 'amd') {
                val = TypeScript.ModuleGenTarget.Asynchronous;
            }
        }
        return val;
    }

    function prepareWatch(optVal: any, files: string[], io: GruntTs.GruntIO): GruntTs.WatchOpt{
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
                    return io.normalizePath(io.resolvePath(_path.dirname(file)));
                });
            },
            extractPath = (files: string[]): string => {
                var dirNames: string[] = getDirNames(files);
                return dirNames.reduce<string>((prev, curr) => {
                    if(!prev){
                        return curr;
                    }
                    var left =  io.normalizePath(_path.relative(prev, curr)),
                        right = io.normalizePath(_path.relative(curr, prev)),
                        match = left.match(/^(\.\.(\/)?)+/);
                    if(match){
                        return io.normalizePath(_path.resolve(prev, match[0]));
                    }
                    match = right.match(/^(\.\.\/)+/);
                    if(match){
                        return io.normalizePath( _path.resolve(curr, match[0]));
                    }
                    return prev;
                }, undefined);
            };
        if(!optVal){
            return undefined;
        }
        if(util.isStr(optVal)){
            return {
                path: (optVal + ""),
                after: [],
                before: [],
                atBegin: false
            };
        }
        if(util.isBool(optVal) && !!optVal){
            return {
                path: extractPath(files),
                after: [],
                before: [],
                atBegin: false
            }
        }
        if(!optVal.path){
            optVal.path = extractPath(files);
        }
        if(optVal.after && !util.isArray(optVal.after)){
            after.push(<string>optVal.after);
        }else if(util.isArray(optVal.after)){
            after = optVal.after;
        }
        if(optVal.before && !util.isArray(optVal.before)){
            before.push(<string>optVal.before);
        }else if(util.isArray(optVal.before)){
            before = optVal.before;
        }

        return {
            path: optVal.path,
            after:  after,
            before: before,
            atBegin: !!optVal.atBegin
        };
    }

    export enum NewLine{
        crLf,
        lf,
        auto
    }

    export interface WatchOpt{
        path: string;
        after: string[];
        before: string[];
        atBegin: boolean;
    }

    export class Opts{
        public newLine: NewLine;
        public indentStep: number;
        public useTabIndent: boolean;
        public basePath: string;
        public outputOne: boolean;
        public sourceMap: boolean;
        public noLib: boolean;
        public declaration: boolean;
        public removeComments: boolean;
        public noResolve: boolean;
        public ignoreError: boolean;
        public langTarget: TypeScript.LanguageVersion;
        public moduleTarget: TypeScript.ModuleGenTarget;
        public noImplicitAny: boolean;
        public disallowAsi: boolean;
        public watch: GruntTs.WatchOpt;

        public destinationPath: string;

        constructor(private _source: any, private grunt:IGrunt, private gruntFile: grunt.file.IFileMap,  private _io: GruntTs.GruntIO){
            this._source = _source || {};
            this.destinationPath = _io.normalizePath(gruntFile.dest);

            this.newLine = prepareNewLine(this._source.newLine);
            this.indentStep = prepareIndentStep(this._source.indentStep);
            this.useTabIndent = !!this._source.useTabIndent;
            this.basePath = prepareBasePath(this._source, this._io);
            this.outputOne = !!this.destinationPath && _path.extname(this.destinationPath) === ".js";
            this.noResolve = prepareNoResolve(this._source.noResolve);
            this.sourceMap = prepareSourceMap(this._source, this._io);
            this.noLib = prepareNoLib(this._source, this._io);
            this.declaration = !!this._source.declaration;
            this.removeComments = !this._source.comments;
            this.ignoreError = prepareIgnoreError(this._source.ignoreError);
            this.langTarget = prepareTarget(this._source);
            this.moduleTarget = prepareModule(this._source);
            this.noImplicitAny = typeof this._source.noImplicitAny === "undefined" ? undefined : !!this._source.noImplicitAny;
            this.disallowAsi = typeof this._source.disallowAsi === "undefined" ? undefined : !!this._source.disallowAsi;

            //experimental
            this.watch = prepareWatch(this._source.watch || this._source._watch, this.expandedFiles(), _io);

            checkIgnoreTypeCheck(this._source, this._io);
        }

        public expandedFiles(): string[]{
            return this.grunt.file.expand(<string[]>this.gruntFile.orig.src);
        }

        public createCompilationSettings(): TypeScript.ImmutableCompilationSettings{

            var settings = new TypeScript.CompilationSettings(),
                dest = this.destinationPath,
                ioHost = this._io;

            if(this.outputOne){
                settings.outFileOption = _path.resolve(ioHost.currentPath(), dest);
            }

            settings.mapSourceFiles = this.sourceMap;
            settings.generateDeclarationFiles = this.declaration;
            settings.removeComments = this.removeComments;

            if(!util.isUndef(this.langTarget)){
                settings.codeGenTarget = this.langTarget;
            }
            if(!util.isUndef(this.moduleTarget)){
                settings.moduleGenTarget = this.moduleTarget;
            }
            if(!util.isUndef(this.noImplicitAny)){
                settings.noImplicitAny = this.noImplicitAny;
            }
            if(!util.isUndef(this.disallowAsi)){
                settings.allowAutomaticSemicolonInsertion = this.disallowAsi;
            }

            settings.noLib = this.noLib;
            settings.noResolve = this.noResolve;

            return TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings);
        }
    }
}