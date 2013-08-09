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
//            "no-module":{
//                src: "test/fixtures/no-module.ts"
//            },
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
            "single-sourcemap":{
                src:"test/fixtures/single/**/*.ts",
                dest: "test/temp/single-sourcemap.js",
                options:{
                    sourcemap: true,
                    fullSourceMapPath:true
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
            },
            noImplicitAny:{
                src:"test/fixtures/noImplicitAny.ts",
                options:{
                    noImplicitAny: true,
                    ignoreTypeCheck: true
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
        },
        nodeunit:{
            tests:["test/test.js"]
        }
    });

    grunt.loadTasks("tasks");
    grunt.loadNpmTasks("grunt-contrib-nodeunit");
    grunt.loadNpmTasks("grunt-contrib-clean");

    grunt.registerTask("build", ["shell:build"]);
    grunt.registerTask("test", ["clean:test", "typescript", "nodeunit"]);
    grunt.registerTask("default", ["test"]);

};
