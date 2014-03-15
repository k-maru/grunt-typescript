///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/tsc/tsc.d.ts" />
///<reference path="io.ts" />

module GruntTs{

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
            grunt.log.writeln("'base_path' option is now obsolate. please use 'basePath'".yellow);
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

        constructor(private _grunt: IGrunt, private _source: any, private _io: GruntTs.GruntIO, private _dest: string){
            var _path = require("path");
            this._source = _source || {};
            //this._dest = _io.normalizePath(_dest);
            this.newLine = prepareNewLine(this._source.newLine);
            this.indentStep = prepareIndentStep(this._source.indentStep);
            this.useTabIndent = !!this._source.useTabIndent;
            this.basePath = prepareBasePath(this._source, this._grunt, this._io);
            this.outputOne = !!this._dest && _path.extname(this._dest) === ".js";
            this.ignoreTypeCheck = typeof this._source.ignoreTypeCheck === "undefined";
        }
    }
}