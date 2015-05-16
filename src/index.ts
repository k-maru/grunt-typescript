///<reference path="../typings/typescript.d.ts" />
///<reference path="../typings/node.d.ts" />
///<reference path="../typings/grunt.d.ts" />
///<reference path="../typings/bluebird.d.ts" />

import * as ts from "typescript";
import * as gts from "./modules/task";

import * as util from "./modules/util";
import * as Promise from "bluebird";
import * as compiler from "./modules/compiler";

function startup(grunt: IGrunt) {
	
	grunt.registerMultiTask("typescript", "Compile typescript to javascript.", function(){
		let that: grunt.task.IMultiTask<{src: string;}> = this,
	        done = that.async(),
			promises = that.files.map((gruntFile) => {
				let task = new gts.Task(grunt, that.options({}), gruntFile)
				return compiler.execute(task);
			});
		
		Promise.all(promises).then(() => {
			done()
		}).catch(() => {
			done(false);
		});
	});
}
export = startup;