///<reference path="../../typings/tsc/tsc.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var GruntTs;
(function (GruntTs) {
    var Compiler = (function (_super) {
        __extends(Compiler, _super);
        function Compiler() {
            _super.apply(this, arguments);
        }
        return Compiler;
    })(TypeScript.TypeScriptCompiler);
    GruntTs.Compiler = Compiler;
})(GruntTs || (GruntTs = {}));

module.exports = GruntTs;
