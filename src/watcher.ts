///<reference path="../typings/node/node.d.ts" />
///<reference path="./util.ts" />

module GruntTs{

    var _path = require("path"),
        _fs: any = require("fs");

    export interface Watcher{
        start() : void
    }

    export function createWatcher(watchPaths: string[], callback: (targets: {[key: string]: {mtime: number; ev: string}}, done: () => void) => void): Watcher{

        var chokidar: any = require("chokidar"),
            watcher: any,
            timeoutId: any,
            callbacking = false,
            events: {[key: string]:  {mtime: number; ev: string}} = {};

        function start() : void{
            if(watcher){
                return;
            }

            watcher = chokidar.watch(watchPaths, { ignoreInitial: true, persistent: true});
            watcher.on("add", (path: string, stats: any) => {
                add(path, "add", stats);
            }).on("change", (path: string, stats: any) => {
                add(path, "change", stats);
            }).on("unlink", (path: string, stats: any) =>{
                add(path, "unlink", stats);
            }).on("error", (error: string) => {
                util.writeError(error);
            });
        }

        function add(path: string, eventName: string, stats: any){
            if(_path.extname(path) !== ".ts"){
                return;
            }
            path = ts.normalizePath(path);

            if(stats && stats.mtime){
                events[path] = {
                    mtime: stats.mtime.getTime(),
                    ev: eventName
                };
            }else{
                events[path] = {
                    mtime: _fs.statSync(path).mtime.getTime(),
                    ev: eventName
                };
            }

            util.write(eventName.cyan + " " + path);

            executeCallback();
        }

        function clone(value: {[key: string]:  {mtime: number; ev: string}}): {[key: string]:  {mtime: number; ev: string}}{
            var result: {[key: string]:  {mtime: number; ev: string}} = {};
            Object.keys(value).forEach((item) => {
               result[item] = value[item];
            });
            return result;
        }

        function executeCallback(){
            if(!Object.keys(events).length){
                return;
            }
            if(callbacking){
                return;
            }
            if(timeoutId){
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(function(){
                callbacking = true;
                var value = clone(events);
                events = {};

                try{
                    callback(value, function(){
                        callbacking = false;
                        executeCallback();
                    });
                }catch(e){
                    callbacking = false;
                }
            }, 1000);

        }

        return {
            start: start
        };
    }

}