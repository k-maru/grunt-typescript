///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />
///<reference path="./option.ts" />
///<reference path="./host.ts" />
///<reference path="./io.ts" />
///<reference path="./watcher.ts" />

module GruntTs{

    var Q = require("q"),
        _path = require("path");

    export function execute(grunt:IGrunt, options: GruntOptions, host: GruntHost): Q.Promise<any>{

        host.io.verbose("--task.execute");
        host.io.verbose("  options: " + JSON.stringify(options));

        return Q.Promise((resolve: (val: any) => void, reject: (val: any) => void, notify: (val: any) => void) => {

            if(options.gWatch){
                watch(grunt, options, host);
            }else{
                try{
                    if(compile(options, host)){
                        resolve(true);
                    }else{
                        reject(false);
                    }
                }catch(e){
                    util.writeAbort(e.message);
                    if(e.stack){
                        util.writeAbort(e.stack);
                    }
                    reject(false);
                }
            }
        });
    }

    function watch(grunt:IGrunt, options: GruntOptions, host: GruntHost): void{
        var watchOpt = options.gWatch,
            watchPath = watchOpt.path,
            targetPaths: {[key:string]: string;} = {},
            watcher = createWatcher(watchPath, (files, done) => {
                startCompile(Object.keys(files)).finally(() => {
                    done();
                });
            }),
            startCompile = (files?: string[]) => {
                return runTask(grunt, host, watchOpt.before).then(() => {
                    if(!recompile(options, host, files)){
                        //失敗だった場合はリセット
                        host.reset(files);
                    }
                    return runTask(grunt, host, watchOpt.after);
                }).then(function(){
                    writeWatching(watchPath);
                });
            };

        if(watchOpt.atBegin){
            startCompile().finally(() => {
                watcher.start();
            });
        }else{
            writeWatching(watchPath);
            watcher.start();
        }
    }

    function writeWatching(watchPath: string[]): void {
        util.write("");
        util.write("Watching... " + watchPath);
    }

    function recompile(options: GruntOptions, host: GruntHost, updateFiles: string[] = []): boolean {

        host.io.verbose("--task.recompile");

        host.reset(updateFiles);
        return compile(options, host);
    }

    function compile(options: GruntOptions, host: GruntHost): boolean {
        host.io.verbose("--task.compile");

        var start = Date.now(),
            defaultLibFilename = host.getDefaultLibFilename(),
            targetFiles = getTargetFiles(options, host);

        if(options._showNearlyTscCommand){
            writeNearlyTscCommand(targetFiles, options);
        }

        var program = ts.createProgram(targetFiles, options, host),
            errors: ts.Diagnostic[] = program.getDiagnostics();

        if(writeDiagnostics(errors)){
            return false;
        }

        var checker = program.getTypeChecker(/*fullTypeCheckMode*/ true);

        errors = checker.getGlobalDiagnostics();
        program.getSourceFiles().forEach((sourceFile) => {
            if(!options.noLib && sourceFile.filename === defaultLibFilename) {
                return;
            }
            errors.push.apply(errors, checker.getDiagnostics(sourceFile)); //.filter(d => d.file === sourceFile);
        });

        //errors = checker.getDiagnostics();

        if(writeDiagnostics(errors, !!options.ignoreError)){
            if(!options.ignoreError){
                return false;
            }
        }

        errors.length = 0;
        if(!options.singleFile){
            program.getSourceFiles().forEach((sourceFile) => {
                if(!options.noLib && sourceFile.filename === defaultLibFilename){
                    return;
                }
                var emitOutput = checker.emitFiles(sourceFile);
                errors.push.apply(errors, emitOutput.errors);
            });
        }else{
            errors = checker.emitFiles().errors;
        }

        /*var emitOutput = ;*/
        /*var emitErrors = emitOutput.errors;*/

        //if(writeDiagnostics(emitErrors)){
        if(writeDiagnostics(errors)){
            return false;
        }

        host.writeResult(Date.now() - start);
        return true;
    }

    function getTargetFiles(options: GruntOptions, host: GruntHost){

        host.io.verbose("--task.getTargetFiles");

        var codeFiles = options.targetFiles(),
            libFiles: string[] = options.references();

        host.io.verbose("  external libs: " + JSON.stringify(libFiles));

        return libFiles.concat(codeFiles);
    }

    function writeDiagnostics(diags: ts.Diagnostic[],isWarn: boolean = false): boolean{
        diags.forEach((d) => {
            var output = "";
            if (d.file) {
                var loc = d.file.getLineAndCharacterFromPosition(d.start);
                output += d.file.filename + "(" + loc.line + "," + loc.character + "): ";
            }
            var category = ts.DiagnosticCategory[d.category].toLowerCase();
            output += category + " TS" + d.code + ": " + d.messageText;
            if(isWarn){
                util.writeWarn(output);
            }else{
                util.writeError(output);
            }
        });
        return !!diags.length;
    }

    function runTask(grunt: IGrunt, host: GruntHost, tasks: string[]): Q.Promise<any> {

        host.io.verbose("--task.runTask");

        return util.asyncEach<string>(tasks, (task:string, index:number, next:()=> void) => {

            host.io.verbose("  external task start: " + task);

            grunt.util.spawn({
                grunt: true,
                args: [task].concat(grunt.option.flags()),
                opts: {stdio: 'inherit'}
            }, function (err, result, code) {

                host.io.verbose("external task end: " + task);

                next();
            });
        });
    }

    function writeNearlyTscCommand(targetFiles: string[], options: GruntOptions): void{
        try{
            var strs: string[] = [];
            strs.push("tsc");
            if(options.declaration){
                strs.push("-d");
            }
            if(options.sourceMap){
                strs.push("--sourceMap");
            }
            if(options.module){
                strs.push("-m");
                strs.push(options.module === ts.ModuleKind.CommonJS ? "commonjs" : "amd");
            }
            if(options.target){
                strs.push("-t");
                strs.push(options.target === ts.ScriptTarget.ES3 ? "es3" : "es5");
            }
            if(options.noImplicitAny){
                strs.push("--noImplicitAny");
            }
            if(options.noLib){
                strs.push("--noLib");
            }
            if(options.noResolve){
                strs.push("--noResolve");
            }
            if(options.removeComments){
                strs.push("--removeComments");
            }
            if(options.singleFile){
                strs.push("--out");
                strs.push(options.out);
            }
            util.writeInfo(strs.concat(targetFiles).join(" "));
        }catch(e){

        }
    }
}
