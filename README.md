grunt-typescript
================

Compile TypeScript

## Documentation
You'll need to install `grunt-typescript` first:

    npm install grunt-typescript --save-dev

Then modify your `Gruntfile.js` file by adding the following line:

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
              target: 'es5', //or es3
              base_path: 'path/to/typescript/files',
              sourcemap: true,
              fullSourceMapPath: true,
              declaration: true,
            }
          }
        },
        ...
    });
   
If you want to create a js file that is a concatenation of all the ts file (like -out option from tsc), 
you should specify the name of the file with the '.js' extension to dest option.

    grunt.initConfig({
        ...
        typescript: {
          base: {
            src: ['path/to/typescript/files/**/*.ts'],
            dest: 'where/you/want/your/js/file.js',
            options: {
              module: 'amd', //or commonjs
            }
          }
        },
        ...
    });

##Options

###nolib `boolean`
Do not include a default lib.d.ts with global declarations

###target `string`
Specify ECMAScript target version: "ES3" (default) or "ES5"

###module `string`
Specify module code generation: "commonjs" (default) or "amd"

###sourcemap `boolean`
Generates corresponding .map files

###fullSourceMapPath `boolean`
Writes the full path of map file in the generated js file

###declaration `boolean`
Generates corresponding .d.ts file

###comments `boolean`
Emit comments to output

###disallowbool `boolean`
Throw error for use of deprecated "bool" type

###disallowimportmodule `boolean`
Throw error for use of deprecated "module" keyword when referencing an external module. Only allow "require" keyword

<!--
base_path, ignoreTypeCheck
-->

※I'm sorry for poor English
