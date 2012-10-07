grunt-typescript
================

Compile TypeScript

## Documentation
You'll need to install `grunt-typescript` first:

    npm install grunt-typescript

Then modify your `grunt.js` file by adding the following line:

    grunt.loadNpmTasks('grunt-typescript');

Then add some configuration for the plugin like so:

    grunt.initConfig({
        ...
        typescript: {
          base: {
            src: ['path/to/typescript/files/**/*.ts'],
            dest: 'where/you/want/your/js/files',
            options: {
              module: 'amd', //or commonjs
              base_path: 'path/to/typescript/files'
            }
          }
        },
        ...
    });