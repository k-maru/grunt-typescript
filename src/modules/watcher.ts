///<reference path="../../typings/node.d.ts" />

import * as gts from "./task";
import * as util from "./util";

let _path: NodeJS.Path = require("path"),
	_fs: NodeJS.FileSystem = require("fs");

export function createWatcher(watchPaths: string[], callback: (targets: {[key: string]: {mtime: number; ev: string}}, done: () => void) => void): gts.Watcher{

    let chokidar: any = require("chokidar"),
        watcher: any,
        timeoutId: NodeJS.Timer,
        callbacking = false,
        events: {[key: string]:  {mtime: number; ev: string}} = {};

    function start() : void{
        if(watcher){
            return;
        }

        watcher = chokidar.watch(watchPaths, { ignoreInitial: true, persistent: true, ignorePermissionErrors: true});
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
        if(_path.extname(path) !== ".ts" || _path.extname(path) !== ".tsx"){
            return;
        }
        path = util.normalizePath(path);

        if(stats && stats.mtime){
            events[path] = {
                mtime: stats.mtime.getTime(),
                ev: eventName
            };
        }else{
            events[path] = {
                mtime: eventName === "unlink" ? 0 : _fs.statSync(path).mtime.getTime(),
                ev: eventName
            };
        }

        util.write(eventName.cyan + " " + path);

        executeCallback();
    }

    function clone(value: {[key: string]:  {mtime: number; ev: string}}): {[key: string]:  {mtime: number; ev: string}}{
        let result: {[key: string]:  {mtime: number; ev: string}} = {};
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
            let value = clone(events);
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