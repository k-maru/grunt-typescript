module NoImplicitAny {
    export function main(foo) {

        return foo;

    }
}

var foo = NoImplicitAny.main("a");