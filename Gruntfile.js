module.exports = function (grunt) {
    "use strict";

    var fs = require("fs"),
        path = require("path"),
        cp = require('child_process'),
        Q = require('q');

    grunt.initConfig({
        clean:{
            test:[
                "test/fixtures/**/*.js",
                "test/fixtures/**/*.js.map",
                "test/fixtures/**/*.d.ts",
                "test/temp/**/*.*",
                "test/temp"
            ],
            expect: "test/expected"
        },
        typescript:{
            simple:{
                src: ["test/fixtures/simple.ts"],
                options:{
                }
            },
            declaration:{
                src:"test/fixtures/declaration.ts",
                options:{
                    declaration:true
                }
            },
            sourcemap:{
                src:"test/fixtures/sourcemap.ts",
                dest:"test/fixtures/sourcemap/",
                options:{
                    basePath: "test/fixtures/",
                    sourceMap:true
                }
            },
            dest:{
                src:"test/fixtures/dest.ts",
                dest: "test/temp/dest",
                options:{
                    sourceMap: true,
                    declaration: true,
                    basePath: "test/fixtures"
                }
            },
            single:{
                src:"test/fixtures/single/**/*.ts",
                dest: "test/temp/single.js"
            },
            es5:{
                src:"test/fixtures/es5.ts",
                options:{
                    target:"ES5"
                }
            },
            amd:{
                src:"test/fixtures/amd.ts",
                options:{
                    module:"amd"
                }
            },
            commonjs:{
                src:"test/fixtures/commonjs.ts",
                options:{
                    module:"commonjs"
                }
            },
            "single-sourcemap":{
                src:"test/fixtures/single/**/*.ts",
                dest: "test/temp/single-sourcemap.js",
                options:{
                    sourceMap: true
                }
            },
            multi:{
                src:"test/fixtures/multi/**/*.ts",
                dest:"test/temp/multi"
            },
            basePath:{
                src:"test/fixtures/multi/**/*.ts",
                dest:"test/temp/basePath",
                options: {
                    basePath: "test/fixtures/multi"
                }
            },
            "utf8-with-bom":{
                src:"test/fixtures/utf8-with-bom.ts"
            },
            "no-output":{
                //存在しないファイル
                src:"text/fixtures/no-output.ts",
                dest:"test/temp/no-output.js"
            },
            comments:{
                src:"test/fixtures/comments.ts",
                options:{
                    comments:true
                }
            },
            noImplicitAny:{
                src:"test/fixtures/noImplicitAny.ts",
                options:{
                    //ignoreTypeCheck: false,
                    noImplicitAny: true

                }
            },
            noImplicitAny2:{
                src:"test/fixtures/noImplicitAny2.ts",
                options:{
                    //ignoreTypeCheck: false,
                    noImplicitAny: true

                }
            },
            newline_lf: {
                src:"test/fixtures/newline.ts",
                dest: "test/fixtures/newline_lf.js",
                options:{
                    //ignoreTypeCheck: false,
                    newLine: "lf"
                }
            },
            newline_crlf: {
                src:"test/fixtures/newline.ts",
                dest: "test/fixtures/newline_crlf.js",
                options:{
                    //ignoreTypeCheck: false,
                    newLine: "crlf"
                }
            },
            newline_auto: {
                src:"test/fixtures/newline.ts",
                dest: "test/fixtures/newline_auto.js",
                options:{
                    //ignoreTypeCheck: false,
                    newLine: "auto"
                }
            },
            useTabIndent: {
                src:"test/fixtures/useTabIndent.ts",
                dest: "test/fixtures/useTabIndent.js",
                options:{
                    useTabIndent: true
                }
            },
            indentStep0: {
                src:"test/fixtures/indentStep.ts",
                dest: "test/fixtures/indentStep_0.js",
                options:{
                    indentStep: 0
                }
            },
            priorityUseTabIndent: {
                src:"test/fixtures/indentStep.ts",
                dest: "test/fixtures/indentStep_2.js",
                options:{
                    indentStep: 2
                }
            },
            indentStep2: {
                src:"test/fixtures/useTabIndent.ts",
                dest: "test/fixtures/useTabIndent_priority.js",
                options:{
                    useTabIndent: true,
                    indentStep: 2
                }
            }
            , errortypecheck: {
                src: "test/fixtures/error-typecheck.ts",
                options: {
                    //ignoreTypeCheck: false
                }
            }
//            , errorsyntax:{
//                src: "test/fixtures/error-syntax.ts",
//                options: {
//                    ignoreTypeCheck: false
//                }
//            }
        },
        nodeunit:{
            tests:["test/test.js"]
        },
        exec:{
            build:{
                command: function(){
                    var files = fs.readdirSync("src").filter(function(file){
                        file = "src/" + file;
                        return fs.statSync(file).isFile() && /.*\.ts$/.test(file); //絞り込み
                    }).map(function(file){
                        return "src" + path.sep + file;
                    }).join(" ");
                    return ["node_modules", ".bin", "tsc " + files + " --noImplicitAny --out tasks", "typescript.js"].join(path.sep);
                }
            }
        }
    });

    grunt.loadTasks("tasks");
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks("grunt-contrib-nodeunit");
    grunt.loadNpmTasks("grunt-contrib-clean");

    grunt.registerTask("build", ["exec:build"]);
    grunt.registerTask("test", ["clean:test", "typescript", "nodeunit"]);
    grunt.registerTask("default", ["test"]);

    grunt.registerTask('egen', 'Genereate test expected files.', function() {
        var done = this.async(),
            command = "node " + path.resolve(path.dirname(require.resolve("typescript")), "tsc "),
            tsc = function(option){
                var defer = Q.defer(),
                    childProcess = cp.exec(command + option, {});
                childProcess.stdout.on('data', function (d) { grunt.log.writeln(d); });
                childProcess.stderr.on('data', function (d) { grunt.log.error(d); });

                childProcess.on('exit', function(code) {
                    if (code !== 0) {
                        defer.reject();;
                    }
                    defer.resolve();
                });
                return defer.promise;
            };

        grunt.file.mkdir("test/expected/multi/dir");
        grunt.file.mkdir("test/expected/single");
        grunt.file.mkdir("test/expected/sourcemap");

        grunt.log.writeln("Simple");
        tsc("test/fixtures/simple.ts").then(function(){
            grunt.file.copy("test/fixtures/simple.js", "test/expected/simple.js");

            grunt.log.writeln("Declaration");
            return tsc("test/fixtures/declaration.ts --declaration");
        }).then(function(){
            grunt.file.copy("test/fixtures/declaration.js", "test/expected/declaration.js");
            grunt.file.copy("test/fixtures/declaration.d.ts", "test/expected/declaration.d.ts");

            grunt.log.writeln("Sourcemap");
            return tsc("test/fixtures/sourcemap.ts --outDir test/fixtures/sourcemap --sourcemap");
        }).then(function(){
            grunt.file.copy("test/fixtures/sourcemap/sourcemap.js","test/expected/sourcemap/sourcemap.js");
            grunt.file.copy("test/fixtures/sourcemap/sourcemap.js.map", "test/expected/sourcemap/sourcemap.js.map");

            grunt.log.writeln("Target ES5");
            return tsc("test/fixtures/es5.ts --target ES5");
        }).then(function(){
            grunt.file.copy("test/fixtures/es5.js", "test/expected/es5.js");

            grunt.log.writeln("AMD");
            return tsc("test/fixtures/amd.ts --module amd");
        }).then(function(){
            grunt.file.copy("test/fixtures/amd.js", "test/expected/amd.js");

            grunt.log.writeln("CommonJS");
            return tsc("test/fixtures/commonjs.ts --module commonjs");
        }).then(function(){
            grunt.file.copy("test/fixtures/commonjs.js", "test/expected/commonjs.js");

            grunt.log.writeln("Single");
            return tsc("test/fixtures/single/dir/single2.ts test/fixtures/single/single1.ts --out test/temp/single.js");
        }).then(function(){
            grunt.file.copy("test/temp/single.js", "test/expected/single/single.js");

            grunt.log.writeln("Single-SourceMap");
            return tsc("test/fixtures/single/dir/single2.ts test/fixtures/single/single1.ts --out test/temp/single-sourcemap.js --sourcemap");
        }).then(function(){
            grunt.file.copy("test/temp/single-sourcemap.js", "test/expected/single/single-sourcemap.js");
            grunt.file.copy("test/temp/single-sourcemap.js.map", "test/expected/single/single-sourcemap.js.map");

            grunt.log.writeln("Multi");
            return tsc("test/fixtures/multi/multi1.ts --outDir test/temp/multi").then(function(){
                return tsc("test/fixtures/multi/dir/multi2.ts --outDir test/temp/multi/dir");
            });
        }).then(function(){
            grunt.file.copy("test/temp/multi/multi1.js", "test/expected/multi/multi1.js");
            grunt.file.copy("test/temp/multi/dir/multi2.js", "test/expected/multi/dir/multi2.js");

            grunt.log.writeln("BOM");
            return tsc("test/fixtures/utf8-with-bom.ts");
        }).then(function(){
            grunt.file.copy("test/fixtures/utf8-with-bom.js", "test/expected/utf8-with-bom.js");

            grunt.log.writeln("Comment");
            return tsc("test/fixtures/comments.ts");
        }).then(function(){
            grunt.file.copy("test/fixtures/comments.js", "test/expected/comments.js");

            grunt.log.writeln("NewLine");
            return tsc("test/fixtures/newline.ts");
        }).then(function(){
            grunt.file.copy("test/fixtures/newline.js", "test/expected/newline_auto.js");
            var val = grunt.file.read("test/fixtures/newline.js").toString();
            val = val.replace(/\r\n/g, "\n");
            grunt.file.write("test/expected/newline_lf.js", val);
            val = val.replace(/\n/g, "\r\n");
            grunt.file.write("test/expected/newline_crlf.js", val);

            grunt.log.writeln("UseTabIndent");
            return tsc("test/fixtures/useTabIndent.ts");
        }).then(function(){
            var val = grunt.file.read("test/fixtures/useTabIndent.js").toString();
            val = val.replace(/    /g, "\t");
            grunt.file.write("test/expected/useTabIndent.js", val);
            grunt.file.write("test/expected/useTabIndent_priority.js", val);

            grunt.log.writeln("IndentStep");
            return tsc("test/fixtures/indentStep.ts");
        }).then(function(){
            var val = grunt.file.read("test/fixtures/indentStep.js").toString();
            grunt.file.write("test/expected/indentStep_0.js", val.replace(/    /g, ""));
            grunt.file.write("test/expected/indentStep_2.js", val.replace(/    /g, "  "));

        }).then(function(){
            done(true);
        }).fail(function(){
            done(false);
        });
    });
};
