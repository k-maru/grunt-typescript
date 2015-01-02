module ES6 {
    export class Test {
        public get greeting() : string {
            return "Hello!";
        }
    }
}

(function(){

    const name = "taro";
    let test = new ES6.Test();

    let texts: string[] = [test.greeting, name];
    let iter = texts.values(); //(<any>texts[<any>Symbol.iterator])();
    while(true){
        let val = iter.next();
        if(!val.done) break;
    }
})();
