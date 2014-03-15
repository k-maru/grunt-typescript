///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/tsc/tsc.d.ts" />
///<reference path="io.ts" />

module GruntTs{

    var _path = require("path");

    function prepareNewLine(optVal: any): NewLine{
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

    function isStr(val: any): boolean{
        return Object.prototype.toString.call(val) === "[object String]";
    }

    function prepareBasePath(opt: any, grunt: IGrunt, io: GruntTs.GruntIO): string{
        var optVal: string = "";
        if(isStr(opt.base_path)){
            grunt.log.writeln("The 'base_path' option will be obsoleted. Please use the 'basePath'.".yellow);
            optVal = opt.base_path;
        }
        if(isStr(opt.basePath)){
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

    function prepareSourceMap(opt: any, grunt: IGrunt): boolean{
        var optVal: boolean = false;
        if(opt.sourcemap){
            grunt.log.writeln("The 'sourcemap' option will be obsoleted. Please use the 'sourceMap'. (different casing)".yellow);
            optVal = !!opt.sourcemap;
        }
        if(opt.sourceMap){
            optVal = !!opt.sourceMap;
        }
        return optVal;
    }

    function prepareNoLib(opt: any, grunt: IGrunt): boolean{
        var optVal: boolean = false;
        if(opt.nolib){
            grunt.log.writeln("The 'nolib' option will be obsoleted. Please use the 'noLib'. (different casing)".yellow);
            optVal = !!opt.nolib;
        }
        if(opt.noLib){
            optVal = !!opt.noLib;
        }
        return optVal;
    }

    export enum NewLine{
        crLf,
        lf,
        auto
    }

    export class Opts{
        public newLine: NewLine;
        public indentStep: number;
        public useTabIndent: boolean;
        public basePath: string;
        public outputOne: boolean;
        public ignoreTypeCheck: boolean;
        public sourceMap: boolean;
        public noLib: boolean;
        public declaration: boolean;
        public removeComments: boolean;

        constructor(private _grunt: IGrunt, private _source: any, private _io: GruntTs.GruntIO, private _dest: string){
            this._source = _source || {};
            //this._dest = _io.normalizePath(_dest);
            this.newLine = prepareNewLine(this._source.newLine);
            this.indentStep = prepareIndentStep(this._source.indentStep);
            this.useTabIndent = !!this._source.useTabIndent;
            this.basePath = prepareBasePath(this._source, this._grunt, this._io);
            this.outputOne = !!this._dest && _path.extname(this._dest) === ".js";
            this.ignoreTypeCheck = typeof this._source.ignoreTypeCheck === "undefined";
            this.sourceMap = prepareSourceMap(this._source, this._grunt);
            this.noLib = prepareNoLib(this._source, this._grunt);
            this.declaration = !!this._source.declaration;
            this.removeComments = !this._source.comments;
        }

        public createCompilationSettings(): TypeScript.ImmutableCompilationSettings{

            var settings = new TypeScript.CompilationSettings(),
                temp: string;

            var options = this._source;
            var dest = this._dest;
            var ioHost = this._io;

            if(options.fullSourceMapPath){
                ioHost.printLine("fullSourceMapPath not supported.");
            }
            if(options.allowbool){
                ioHost.printLine("allowbool is obsolete.");
            }
            if(options.allowimportmodule){
                ioHost.printLine("allowimportmodule is obsolete.");
            }

            if(options.outputOne){
                settings.outFileOption = _path.resolve(ioHost.currentPath(), dest);
            }

            settings.mapSourceFiles = this.sourceMap;

            settings.generateDeclarationFiles = this.declaration;
            settings.removeComments = this.removeComments;

            //default
            settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript3;
            if (options.target) {
                temp = options.target.toLowerCase();
                if (temp === 'es3') {
                    settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript3;
                } else if (temp == 'es5') {
                    settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
                }
            }
            //default
            settings.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
            if (options.module) {
                temp = options.module.toLowerCase();
                if (temp === 'commonjs' || temp === 'node') {
                    settings.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
                } else if (temp === 'amd') {
                    settings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;
                }
            }
            if(options.noImplicitAny){
                settings.noImplicitAny = true;
            }

            settings.noLib = this.noLib;

            //test
            if(options.disallowAsi){
                settings.allowAutomaticSemicolonInsertion = false;
            }

            return TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings);
        }
    }
}