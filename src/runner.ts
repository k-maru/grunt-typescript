///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="util.ts" />

module GruntTs{
    export function runTask(grunt: IGrunt, tasks: string[]): Q.Promise<any>{

        return util.asyncEach<string>(tasks, (task: string, index: number, next: ()=> void) => {
            grunt.util.spawn({
                grunt: true,
                args: [task].concat(grunt.option.flags()),
                opts: { stdio: 'inherit' }
            }, function (err, result, code) {
                next();
            });
        });

    }
}