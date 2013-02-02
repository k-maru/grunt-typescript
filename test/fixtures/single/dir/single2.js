var Single2;
(function (Single2) {
    function main() {
        return "hello single2";
    }
    Single2.main = main;
})(Single2 || (Single2 = {}));
Single2.main();
