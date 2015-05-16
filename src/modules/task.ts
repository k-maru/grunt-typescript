///<reference path="../../typings/grunt.d.ts" />
///<reference path="../../typings/typescript.d.ts" />
import * as ts from "typescript";
import * as option from "./option";
import * as host from "./host";

function prepareStackTrace(error, structuredStackTrace) {
  let lines = [];
  
  for(let trace of structuredStackTrace){
      lines.push(`${trace.getMethodName() || trace.getFunctionName() || "<anonymous>"}[L${trace.getLineNumber()}] `);
  }
  return lines;
//  
//   structuredStackTrace[0];
//  console.log(structuredStackTrace);
//  
//  
//  
//  return {
//    // method name
//    name: trace.getMethodName() || trace.getFunctionName() || "<anonymous>",
//    // file name
//    file: trace.getFileName(),
//    // line number
//    line: trace.getLineNumber(),
//    // column number
//    column: trace.getColumnNumber()
//  };
}

function getTrace(caller?) {
  let err = (<any>Error),
      original = err.prepareStackTrace,
      error = <any>{};
  err.captureStackTrace(error, caller || getTrace);
  err.prepareStackTrace = prepareStackTrace;
  var stack = error.stack;
  err.prepareStackTrace = original;
  return stack;
}

export class Task implements Logger{
	
    private _options: CompilerOptions;
    private _host: CompilerHost;
    private _initTime: number = 0;
    
    constructor(private _grunt: IGrunt, 
                private _source: any, 
                private _gruntFile: grunt.file.IFilesConfig){
		
        this._initTime = Date.now();
	}
	
	getGrunt(): IGrunt{
		return this._grunt;
	}
	
    getOptions(): CompilerOptions{
        if(!this._options){
            this._options = option.createGruntOption(this._source, this._grunt, this._gruntFile, this);
        }
        return this._options
        
    }
    
    getHost(): CompilerHost{
        if(!this._host){
            this._host = host.createHost(this._grunt, this.getOptions(), this);
        }
        return this._host;
    }
    
	verbose(message: string, stack?: boolean) {
		this._grunt.verbose.writeln(`${message} [${Date.now()-this._initTime}ms]`.grey);
        if(stack){
            this._grunt.verbose.writeln(getTrace().join("\n").grey);
        }
	}
  
}

export interface Logger{
    verbose(message: string, stack?: boolean): void;
}

export interface CompilerHost extends ts.CompilerHost {
    writeResult(ms: number): void;
    reset(fileNames: string[]): void;
//    io: GruntIO;
    //debug(value: any, format?: (value: any) => string): void;
}

export interface SourceFile extends ts.SourceFile{
    mtime: number;
}

export interface WatchOptions{
    path: string[];
    after: string[];
    before: string[];
    atBegin: boolean;
}

export interface CompilerOptions {
    targetFiles(): string[];
    dest: string;
    singleFile: boolean;
    basePath: string;
    keepDirectoryHierarchy?: boolean;
    //ignoreError?: boolean;
    watch?: WatchOptions;
    references(): string[];
    //_showNearlyTscCommand: boolean;
    tsOptions: ts.CompilerOptions;
    
    generateTsConfig: boolean | string;
}

export interface Watcher{
    start() : void
}
