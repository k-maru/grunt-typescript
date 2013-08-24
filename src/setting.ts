///<reference path="./grunt.d.ts" />
///<reference path="./tsc.d.ts" />
///<reference path="./io.ts" />

module GruntTs{
    var _path: any = require("path");

    export function createCompilationSettings(options: any, dest: string, ioHost: GruntIO): TypeScript.CompilationSettings{

        var settings = new TypeScript.CompilationSettings(),
            temp: string;

        if(options.outputOne){
            dest = _path.resolve(ioHost.currentPath(), dest);
            settings.outFileOption = dest;
        }
        if(options.sourcemap || options.fullSourceMapPath){
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
        if(options.allowbool){
            settings.allowBool = true;
        }
        if(options.allowimportmodule){
            settings.allowModuleKeywordInExternalModuleReference = true;
        }

        //test
        if(options.disallowAsi){
            settings.allowAutomaticSemicolonInsertion = false;
        }

        return settings;
    }
}