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

        host.debug(options, (value) => JSON.stringify(options));

        return Q.Promise((resolve: (val: any) => void, reject: (val: any) => void, notify: (val: any) => void) => {

            if(options.gWatch){
                watch(grunt, options, host);
            }else{
                if(compile(options, host)){
                    resolve(true);
                }else{
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
                    recompile(options, host, files);
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

    function recompile(options: GruntOptions, host: GruntHost, updateFiles: string[] = []){
        host.debug("rest host object");
        host.reset(updateFiles);
        compile(options, host);
    }

    function compile(options: GruntOptions, host: GruntHost): boolean{
        var start = Date.now(),
            program = ts.createProgram(options.targetFiles(), options, host),
            errors: ts.Diagnostic[] = program.getDiagnostics();

        if(writeDiagnostics(errors)){
            return false;
        }

        var checker = program.getTypeChecker(/*fullTypeCheckMode*/ true);
        errors = checker.getDiagnostics();

        if(writeDiagnostics(errors, !!options.ignoreError)){
            if(!options.ignoreError){
                return false;
            }
        }

        var emitOutput = checker.emitFiles();
        var emitErrors = emitOutput.errors;
        if(writeDiagnostics(emitErrors)){
            return false;
        }

        host.writeResult(Date.now() - start);
        return true;
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

        host.debug("run tasks");

        return util.asyncEach<string>(tasks, (task:string, index:number, next:()=> void) => {

            host.debug(task + " task start");

            grunt.util.spawn({
                grunt: true,
                args: [task].concat(grunt.option.flags()),
                opts: {stdio: 'inherit'}
            }, function (err, result, code) {

                host.debug(task + " task end");

                next();
            });
        });
    }
}