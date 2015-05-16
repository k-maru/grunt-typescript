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
        var text = trim(data);
        results.push.apply(results, text.split("\n"));
    });
    command.on("close", function(){
        setTimeout(function(){
            results.shift();
            results.pop();
            results.pop();
            results.pop();
            done(results);
        }, 500);
    });
}

function trim(val){
    return ((val || "") + "").trim();
}


module.exports.errorTypescript = {
    errorTypecheck: function (test) {
        "use strict";

        test.expect(1);

        exec(["typescript:errorTypecheck", "--error"], function(results){
            test.equal(">> ".red + "test/fixtures/error-typecheck.ts(1,1): error TS2304: Cannot find name 'foo'.", trim(results[0]));

            //console.log(results[0].trim());

            test.done();

        });
    },
    errorSyntax: function (test) {
        "use strict";
        test.expect(1);
        exec(["typescript:errorSyntax", "--error"], function(results){
            test.equal(">> ".red + "test/fixtures/error-syntax.ts(1,9): error TS1005: ';' expected.", trim(results[0]));
            test.done();
        });
    },

    noLib: function(test){
        "use strict";

        test.expect(8);

        exec(["typescript:noLib", "--error"], function(results){
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Array'.", trim(results[0]));
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Boolean'.", trim(results[1]));
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Function'.", trim(results[2]));
            test.equal(">> ".red + "error TS2318: Cannot find global type 'IArguments'.", trim(results[3]));
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Number'.", trim(results[4]));
            test.equal(">> ".red + "error TS2318: Cannot find global type 'Object'.", trim(results[5]));
            test.equal(">> ".red + "error TS2318: Cannot find global type 'RegExp'.", trim(results[6]));
            test.equal(">> ".red + "error TS2318: Cannot find global type 'String'.", trim(results[7]));
            test.done();
        });
    },
    noLibCore: function(test){

        "use strict";

        test.expect(1);

        exec(["typescript:noLibCore", "--error"], function(results){
            test.equal(">> ".red + "test/fixtures/noLib.ts(4,10): error TS2304: Cannot find name 'document'.", trim(results[0]));

            test.done();
        });
    }
}
