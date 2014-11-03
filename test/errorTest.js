var grunt = require("grunt");
var fs = require("fs");
var path = require("path");
var spawn = require('child_process').spawn;

function exec(arg, done){
    var cmd = process.execPath;
    var args = process.execArgv.concat(process.argv[1], arg);

    var command = spawn(cmd, args),
        results = [];
    command.stdout.on("data", function(data){
        //results.push(data.toString());
        var text = data.toString().trim();
        results.push.apply(results, text.split("\n"));
    });
    command.on("close", function(){
        setTimeout(function(){
            results.shift();
            results.pop();
            results.pop();
            results.pop();
            done(results);
        }, 500)
    });
}


module.exports.errorTypescript = {
    errorTypecheck: function (test) {
        "use strict";

        test.expect(1);

        exec(["typescript:errorTypecheck", "--error"], function(results){

            test.equal(">> ".red + "test/fixtures/error-typecheck.ts(1,1): error TS2304: Cannot find name 'foo'.", results[0].trim());

            //console.log(results[0].trim());

            test.done();

        });
    },

    errorSyntax: function (test) {
        "use strict";

        test.expect(1);

        exec(["typescript:errorSyntax", "--error"], function(results){

            test.equal(">> ".red + "test/fixtures/error-syntax.ts(1,9): error TS1005: ';' expected.", results[0].trim());

            test.done();

        });
    },

    noLib: function(test){
        "use strict";

        test.expect(10);

        exec(["typescript:noLib", "--error"], function(results){
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Array'.", results[0].trim());
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Boolean'.", results[1].trim());
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Function'.", results[2].trim());
            test.equal(">> ".red + "error TS2318: Cannot find global type 'IArguments'.", results[3].trim());
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Number'.", results[4].trim());
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Object'.", results[5].trim());
            test.equal(">> ".red + "error TS2318: Cannot find global type 'RegExp'.", results[6].trim());
            test.equal(">> ".red + "error TS2318: Cannot find global type 'String'.", results[7].trim());
            test.equal(">> ".red + "test/fixtures/noLib.ts(2,11): error TS2304: Cannot find name 'parseInt'.", results[8].trim());
            test.equal(">> ".red + "test/fixtures/noLib.ts(4,10): error TS2304: Cannot find name 'document'.", results[9].trim());

            test.done();
        });
    },

    noLibCore: function(test){

        "use strict";

        test.expect(1);

        exec(["typescript:noLibCore", "--error"], function(results){
            test.equal(">> ".red + "test/fixtures/noLib.ts(4,10): error TS2304: Cannot find name 'document'.", results[0].trim());

            test.done();
        });
    }
}
