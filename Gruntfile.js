module.exports = function (grunt) {
    "use strict";

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
                src:["test/fixtures/simple.ts"]
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
                    base_path: "test/fixtures/",
                    sourcemap:true
                }
            },
            "sourcemap-fullpath":{
                src:"test/fixtures/sourcemap-fullpath.ts",
                dest:"test/fixtures/sourcemap/",
                options:{
                    base_path: "test/fixtures/",
                    sourcemap:true,
                    fullSourceMapPath:true
                }
            },
            es5:{
                src:"test/fixtures/es5.ts",
                options:{
                    target:"ES5"
                }
            },
            "no-module":{
                src:"test/fixtures/no-module.ts"
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
            single:{
                src:"test/fixtures/single/**/*.ts",
                dest: "test/temp/single.js"
            },
            multi:{
                src:"test/fixtures/multi/**/*.ts",
                dest:"test/temp/multi"
            },
            basePath:{
                src:"test/fixtures/multi/**/*.ts",
                dest:"test/temp/basePath",
                options: {
                    base_path: "test/fixtures/multi"
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
            }
            , errortypecheck: {
                src: "test/fixtures/error-typecheck.ts",
                options: {
                    ignoreTypeCheck: true
                }
            }
//            , errorsyntax:{
//                src: "test/fixtures/error-syntax.ts"
//            }
//            , errorbool: {
//                src: "test/fixtures/error-bool.ts",
//                options: {
//                    disallowbool: true
//                }
//            }
        },
        nodeunit:{
            tests:["test/test.js"]
        },
        shell: {
            build: {
                command: "node node_modules/typescript/bin/tsc.js " +
                    "src/compiler.ts " +
                    "src/io.ts " +
                    "src/task.ts " +
                    "--out tasks/typescript.js",
                options: {
                    stdout: true,
                    stderr: true
                }
            }
        },
        watch: {
            build: {
                files: ["src/*.ts"],
                tasks: ["shell:build"]
            }
        }
    });

    grunt.loadTasks("tasks");
    grunt.loadNpmTasks("grunt-contrib-nodeunit");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-shell");

    grunt.registerTask("build", ["shell:build"]);
    grunt.registerTask("test", ["clean:test", "typescript", "nodeunit"]);
    grunt.registerTask("default", ["test"]);

};
