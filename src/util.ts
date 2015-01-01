///<reference path="../typings/q/Q.d.ts" />

module GruntTs.util{

    var Q = require('q');

    export function isStr(val: any): boolean{
        return Object.prototype.toString.call(val) === "[object String]";
    }

    export function isBool(val: any): boolean{
        return Object.prototype.toString.call(val) === "[object Boolean]";
    }

    export function isArray(val: any): boolean{
        return Object.prototype.toString.call(val) === "[object Array]";
    }

    export function isUndef(val: any): boolean{
        return typeof val === "undefined";
    }

    export function asyncEach<T>(items: T[], callback: (item: T, index: number, next: () => void) => void): Q.Promise<any>{

        return Q.Promise((resolve: (val: any) => void, reject: (val: any) => void, notify: (val: any) => void) => {
            var length = items.length,
                exec = function(i: number){
                    if(length <= i){
                        resolve(true);
                        return;
                    }
                    var item = items[i];
                    callback(item, i, function(){
                        i = i + 1;
                        exec(i);
                    });
                };
            exec(0);
       });
    }

    export function writeAbort(str: string): void{
        console.log((str || "").red);
    }

    export function writeError(str: string): void{
        console.log(">> ".red + str.trim().replace(/\n/g, "\n>> ".red));
    }

    export function writeInfo(str: string): void{
        console.log(">> ".cyan + str.trim().replace(/\n/g, "\n>> ".cyan));
    }

    export function writeWarn(str: string): void{
        console.log(">> ".yellow + str.trim().replace(/\n/g, "\n>> ".yellow));
    }

    export function write(str: string): void{
        console.log(str);
    }

    export function writeDebug(str: string): void{
        console.log(("-- " + str.trim().replace(/\n/g, "\n-- ")).grey);
    }

    //ts

    var hasOwnProperty = Object.prototype.hasOwnProperty;

    export function hasProperty<T>(value: any, key: string): boolean {
        return hasOwnProperty.call(value, key);
    }

    var colonCode = 0x3A;
    var slashCode = 0x2F;

    export function getRootLength(path: string): number {
        if (path.charCodeAt(0) === slashCode) {
            if (path.charCodeAt(1) !== slashCode) return 1;
            var p1 = path.indexOf("/", 2);
            if (p1 < 0) return 2;
            var p2 = path.indexOf("/", p1 + 1);
            if (p2 < 0) return p1 + 1;
            return p2 + 1;
        }
        if (path.charCodeAt(1) === colonCode) {
            if (path.charCodeAt(2) === slashCode) return 3;
            return 2;
        }
        return 0;
    }

    export function normalizeSlashes(path: string): string {
        return path.replace(/\\/g, "/");
    }

    var directorySeparator = "/";
    function getNormalizedParts(normalizedSlashedPath: string, rootLength: number) {
        var parts = normalizedSlashedPath.substr(rootLength).split(directorySeparator);
        var normalized: string[] = [];
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (part !== ".") {
                if (part === ".." && normalized.length > 0 && normalized[normalized.length - 1] !== "..") {
                    normalized.pop();
                }
                else {
                    normalized.push(part);
                }
            }
        }

        return normalized;
    }

    export function normalizePath(path: string): string {
        var path = normalizeSlashes(path);
        var rootLength = getRootLength(path);
        var normalized = getNormalizedParts(path, rootLength);
        return path.substr(0, rootLength) + normalized.join(directorySeparator);
    }

    export function combinePaths(path1: string, path2: string) {
        if (!(path1 && path1.length)) return path2;
        if (!(path2 && path2.length)) return path1;
        if (path2.charAt(0) === directorySeparator) return path2;
        if (path1.charAt(path1.length - 1) === directorySeparator) return path1 + path2;
        return path1 + directorySeparator + path2;
    }

    export function getDirectoryPath(path: string) {
        return path.substr(0, Math.max(getRootLength(path), path.lastIndexOf(directorySeparator)));
    }
}
