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
        results.push(data.toString());
    });
    command.on("close", function(){
        results.shift();
        results.pop();
        results.pop();
        results.pop();
        done(results);
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

            //console.log(results[0].trim());

            test.done();

        });
    }
}