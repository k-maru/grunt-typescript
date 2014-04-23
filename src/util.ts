module GruntTs.util{

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
}