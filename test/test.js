var grunt = require("grunt");
var fs = require("fs");
var path = require("path");

module.exports.typescript = {
    simple:function (test) {
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/simple.js");
        var expected = grunt.file.read("test/expected/simple.js");
        test.equal(expected, actual);

        test.done();
    },
    dest: function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/temp/dest/test/fixtures/dest.js");
        var expected = grunt.file.read("test/expected/dest.js");
        test.equal(expected, actual);

        test.done();
    },
    basePath: function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/temp/basepath/basepath.js");
        var expected = grunt.file.read("test/expected/basepath.js");
        test.equal(expected, actual);

        test.done();
    },
    declaration:function (test) {
        "use strict";

        test.expect(2);

        var actual = grunt.file.read("test/fixtures/declaration.js");
        var expected = grunt.file.read("test/expected/declaration.js");
        test.equal(expected, actual);

        actual = grunt.file.read("test/fixtures/declaration.d.ts");
        expected = grunt.file.read("test/expected/declaration.d.ts");
        test.equal(expected, actual);

        test.done();
    },
    sourcemap:function(test){
        "use strict";

        test.expect(2);

        var actual = grunt.file.read("test/fixtures/sourcemap.js");
        var expected = grunt.file.read("test/expected/sourcemap.js");

        test.equal(expected, actual, 'incorrect output javascript');

        actual = grunt.file.read("test/fixtures/sourcemap.js.map");
        expected = grunt.file.read("test/expected/sourcemap.js.map");

        test.equal(expected, actual, 'incorrect sourcemap');

        test.done();
    },
    "sourcemap-dest": function(test){
        "use strict";

        test.expect(2);

        var actual = grunt.file.read("test/temp/sourcemap/sourcemap.js");
        var expected = grunt.file.read("test/expected/sourcemap/sourcemap.js");

        test.equal(expected, actual, 'incorrect output javascript');

        actual = grunt.file.read("test/temp/sourcemap/sourcemap.js.map");
        expected = grunt.file.read("test/expected/sourcemap/sourcemap.js.map");

        test.equal(expected, actual, 'incorrect sourcemap dest');

        test.done();
    },
    es5:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/es5.js");
        var expected = grunt.file.read("test/expected/es5.js");
        test.equal(expected, actual);

        test.done();
    },
    es6:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/es6.js");
        var expected = grunt.file.read("test/expected/es6.js");
        test.equal(expected, actual);

        test.done();
    },
    amd:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/amd.js");
        var expected = grunt.file.read("test/expected/amd.js");
        test.equal(expected, actual);

        test.done();
    },
    commonjs:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/commonjs.js");
        var expected = grunt.file.read("test/expected/commonjs.js");
        test.equal(expected, actual);

        test.done();
    },
    umd:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/umd.js");
        var expected = grunt.file.read("test/expected/umd.js");
        test.equal(expected, actual);

        test.done();
    },
    system:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/system.js");
        var expected = grunt.file.read("test/expected/system.js");
        test.equal(expected, actual);

        test.done();
    },
    crlf:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/crlf.js");
        var expected = grunt.file.read("test/expected/crlf.js");
        test.equal(expected, actual);

        test.done();
    },
    lf:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/crlf.js");
        var expected = grunt.file.read("test/expected/crlf.js");
        test.equal(expected, actual);

        test.done();
    },
    decorator:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/decorator.js");
        var expected = grunt.file.read("test/expected/decorator.js");
        test.equal(expected, actual);

        test.done();
    },
    decorator2:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/decorator2.js");
        var expected = grunt.file.read("test/expected/decorator2.js");
        test.equal(expected, actual);

        test.done();
    },
    jsxpreserve:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/jsxpreserve.jsx");
        var expected = grunt.file.read("test/expected/jsxpreserve.jsx");
        test.equal(expected, actual);

        test.done();
    },
    jsxreact:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/jsxreact.js");
        var expected = grunt.file.read("test/expected/jsxreact.js");
        test.equal(expected, actual);

        test.done();
    },
    async:function(test){
        "use strict";

        test.expect(1);

        var actual = grunt.file.read("test/fixtures/async.js");
        var expected = grunt.file.read("test/expected/async.js");
        test.equal(expected, actual);

        test.done();
    },
    single:function(test){
        "use strict";

        test.expect(1);
        var actual = grunt.file.read("test/temp/single.js");
        var expected = grunt.file.read("test/expected/single.js");

        test.equal(expected, actual);

        test.done();
    },
    comments:function(test){
        "use strict";

        test.expect(1);
        var actual = grunt.file.read("test/temp/comments.js");
        var expected = grunt.file.read("test/expected/comments.js");

        test.equal(expected, actual);

        test.done();
    },
    "comments true":function(test){
        "use strict";

        test.expect(1);
        var actual = grunt.file.read("test/temp/comments_true.js");
        var expected = grunt.file.read("test/expected/comments_true.js");

        test.equal(expected, actual);

        test.done();
    },
    "comments false":function(test){
        "use strict";

        test.expect(1);
        var actual = grunt.file.read("test/temp/comments_false.js");
        var expected = grunt.file.read("test/expected/comments_false.js");

        test.equal(expected, actual);

        test.done();
    }
};
