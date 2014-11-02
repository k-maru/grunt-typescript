/// <reference path="../target1/target1.ts" />

module Target2 {
    export function main() {
        return "hello target 2";
    }
}
Target1.main();
Target2.main();
