///<reference path="dir/resolve2.ts" />

module Resolve1 {
    export function main() {
        return Resolve2.main();
    }
}

Resolve1.main();