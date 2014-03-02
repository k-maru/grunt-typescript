///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/tsc/tsc.d.ts" />
///<reference path="./io.ts" />

module GruntTs{
    var _path: any = require("path");

    export function createCompilationSettings(options: any, dest: string, ioHost: GruntIO): TypeScript.ImmutableCompilationSettings{

        var settings = new TypeScript.CompilationSettings(),
            temp: string;

        if(options.fullSourceMapPath){
            ioHost.printLine("fullSourceMapPath not supported.");
        }
        if(options.allowbool){
            ioHost.printLine("allowbool is obsolete.");
        }
        if(options.allowimportmodule){
            ioHost.printLine("allowimportmodule is obsolete.");
        }

        if(options.outputOne){
            dest = _path.resolve(ioHost.currentPath(), dest);
            settings.outFileOption = dest;
        }
        if(options.sourcemap){
            settings.mapSourceFiles = true;
        }
        if(options.declaration){
            settings.generateDeclarationFiles = true;
        }
        if(options.comments){
            settings.removeComments = false;
        }else{
            settings.removeComments = true;
        }
        //default
        settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript3;
        if (options.target) {
            temp = options.target.toLowerCase();
            if (temp === 'es3') {
                settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript3;
            } else if (temp == 'es5') {
                settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;
            }
        }
        //default
        settings.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
        if (options.module) {
            temp = options.module.toLowerCase();
            if (temp === 'commonjs' || temp === 'node') {
                settings.moduleGenTarget = TypeScript.ModuleGenTarget.Synchronous;
            } else if (temp === 'amd') {
                settings.moduleGenTarget = TypeScript.ModuleGenTarget.Asynchronous;
            }
        }
        if(options.noImplicitAny){
            settings.noImplicitAny = true;
        }

        if(options.nolib){
            settings.noLib = true;
        }

        //test
        if(options.disallowAsi){
            settings.allowAutomaticSemicolonInsertion = false;
        }

        return TypeScript.ImmutableCompilationSettings.fromCompilationSettings(settings);
    }
}