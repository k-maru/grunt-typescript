var First;
(function (First) {
    function main() {
        return "hello first";
    }
    First.main = main;
})(First || (First = {}));

First.main();
var Second;
(function (Second) {
    function main() {
        return "hello second";
    }
    Second.main = main;
})(Second || (Second = {}));

Second.main();
