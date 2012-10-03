/*
 * grunt-typescript
 * Copyright 2012 Kazuhide Maruyama
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
  var path = require('path'),
  	  fs = require('fs'),
  	  vm = require('vm'),
  	  ts;

  grunt.registerMultiTask('typescript', 'Compile TypeScript files', function() {
    var dest = this.file.dest,
        options = this.data.options,
        extension = this.data.extension;

    grunt.file.expandFiles(this.file.src).forEach(function(filepath) {
      grunt.helper('compile', filepath, dest, grunt.utils._.clone(options), extension);
    });

    if (grunt.task.current.errorCount) {
      return false;
    } else {
      return true;
    }
  });

  grunt.registerHelper('compile', function(src, destPath, options, extension) {
  	if(!ts) {
  		var code = fs.readFileSync(__dirname + '/../node_modules/typescript/bin/typescript.js');
  		vm.runInThisContext(code, __dirname + '/../node_modules/typescript/bin/typescript.js');
  		ts = TypeScript;
  	}
  	
  	var outfile = {
  		source: '',
  		Write: function(s) {this.source += s;},
  		WriteLine: function(s) {this.source += s + "\r\n";},
  		Close: function(){}
  	};
  	var outerr = {
  		Write: function(s) {},
  		WriteLine: function(s) {},
  		Close: function() {},
	};
	var compiler = new ts.TypeScriptCompiler(outfile, outerr);
	
	compiler.addUnit(grunt.file.read(src), src);
	compiler.emit(false, function(){ return outfile;});
	
	var ext = path.extname(src);
	var newFile;
	if(ext){
		newFile = src.substr(0, src.length - ext.length) + ".js";
	}else{
		newFile = src + ".js";
	}
	grunt.file.write(path.join(destPath, newFile), outfile.source);
    return true;

  });
};
