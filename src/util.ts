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
}
