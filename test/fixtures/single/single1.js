var Single1;
(function (Single1) {
    function main() {
        return "hello single1";
    }
    Single1.main = main;
})(Single1 || (Single1 = {}));
Single1.main();
