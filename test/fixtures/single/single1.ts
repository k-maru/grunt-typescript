/// <reference path="dir/single2.ts" />

module Single1 {
    export function main() {
        return "hello single1";
    }
}

Single2.main();
Single1.main();