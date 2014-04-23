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

        return Q.promise((resolve: (val: any) => void, reject: (val: any) => void, notify: (val: any) => void) => {
            var length = items.length,
                exec = function(i: number){
                    if(length <= i){
                        resolve(true);
                        return;
                    }
                    var item = items[i];
                    console.log(item);
                    callback(item, i, function(){
                        i = i + 1;
                        exec(i);
                    });
                };
            exec(0);

//            if(!this.options.watch){
//                try{
//                    this.exec();
//                    resolve(true);
//                }catch(e){
//                    reject(e);
//                }
//
//            }else{
//                this.startWatch(resolve, reject);
//            }
        });
    }
}