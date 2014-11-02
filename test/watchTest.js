var grunt = require("grunt");
var fs = require("fs");
var util = require("util");
var path = require("path");
var spawn = require('child_process').spawn;

if (!String.prototype.endsWith) {
    Object.defineProperty(String.prototype, 'endsWith', {
        value: function (searchString, position) {
            var subjectString = this.toString();
            if (position === undefined || position > subjectString.length) {
                position = subjectString.length;
            }
            position -= searchString.length;
            var lastIndex = subjectString.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        }
    });
}
if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (searchString, position) {
            position = position || 0;
            return this.lastIndexOf(searchString, position) === position;
        }
    });
}

var mkdir = function(dir) {
    // making directory without exception if exists
    try {
        fs.mkdirSync(dir, 0755);
    } catch(e) {
        if(e.code != "EEXIST") {
            throw e;
        }
    }
};

var rmdir = function(dir) {
    if (path.existsSync(dir)) {
        var list = fs.readdirSync(dir);
        for(var i = 0; i < list.length; i++) {
            var filename = path.join(dir, list[i]);
            var stat = fs.statSync(filename);

            if(filename == "." || filename == "..") {
                // pass these files
            } else if(stat.isDirectory()) {
                // rmdir recursively
                rmdir(filename);
            } else {
                // rm fiilename
                fs.unlinkSync(filename);
            }
        }
        fs.rmdirSync(dir);
    } else {
        console.warn("warn: " + dir + " not exists");
    }
};

var copyDir = function(src, dest) {
    mkdir(dest);
    var files = fs.readdirSync(src);
    for(var i = 0; i < files.length; i++) {
        var current = fs.lstatSync(path.join(src, files[i]));
        if(current.isDirectory()) {
            copyDir(path.join(src, files[i]), path.join(dest, files[i]));
        } else if(current.isSymbolicLink()) {
            var symlink = fs.readlinkSync(path.join(src, files[i]));
            fs.symlinkSync(symlink, path.join(dest, files[i]));
        } else {
            copy(path.join(src, files[i]), path.join(dest, files[i]));
        }
    }
};

var copy = function(src, dest) {
    var oldFile = fs.createReadStream(src);
    var newFile = fs.createWriteStream(dest);
    oldFile.pipe(newFile);
};

function exec(arg, stdout, done){
    var cmd = process.execPath;
    var args = process.execArgv.concat(process.argv[1], arg);

    var command = spawn(cmd, args),
        results = [];
    command.stdout.on("data", function(data){
        var text = data.toString();
        stdout(text);
        results.push(text);
    });
    command.on("close", function(){
        if(done){
            done(results);
        }
    });
    return command;
}

module.exports.watchTypescript = {
    simpleWatch: function (test) {
        "use strict";

        var root = "test/watch/simple/target";

        copyDir("test/watch/simple/dest", root);

        test.expect(3);

        var checks = [{}, {}, {
            stdout: function(text){
                text = text.trim();
                test.ok(text.startsWith("Watching..."));
                test.ok(text.endsWith(root));
            },
            action: function(){
                grunt.file.write(root + "/simple1.ts", grunt.file.read(root + "/simple1.ts") + "   ");
            }
        },{
            stdout: function(text){
                text = text.trim();
                test.ok(text.endsWith(root + "/simple1.ts"));
            }
        },{
            stdout: function(text){
                text = text.trim();
                //test.ok(text.startsWith("2 files"));
            }
        }];

        console.log("");

        var command = exec(["typescript:simpleWatch", "--watch"], function(text){
            var check = checks.shift();
            console.log(text);
            if(!check){

                command.kill();
                return;
            }

            if(!!check.stdout){
                check.stdout(text);
            }
            if(!!check.action){
                setTimeout(function(check){
                    check.action();
                }.bind(null, check), 1000);
            }
            if(!checks.length){
                command.kill();
            }
        }, function(results){
            console.log("done");
            //rmdir(root);
            test.done();
        });

    }
}