mkdir test/expected/multi/dir -p
mkdir test/expected/single
mkdir test/expected/sourcemap

node_modules/typescript/bin/tsc test/fixtures/simple.ts
mv test/fixtures/simple.js test/expected/simple.js -f

node_modules/typescript/bin/tsc test/fixtures/declaration.ts --declaration
mv test/fixtures/declaration.js test/expected/declaration.js
mv test/fixtures/declaration.d.ts test/expected/declaration.d.ts

node_modules/typescript/bin/tsc test/fixtures/sourcemap.ts --sourcemap --out test/fixtures/sourcemap
mv test/fixtures/sourcemap/sourcemap.js test/expected/sourcemap/sourcemap.js
mv test/fixtures/sourcemap/sourcemap.js.map test/expected/sourcemap/sourcemap.js.map

node_modules/typescript/bin/tsc test/fixtures/sourcemap-fullpath.ts --sourcemap --fullSourceMapPath --out test/fixtures/sourcemap
mv test/fixtures/sourcemap/sourcemap-fullpath.js test/expected/sourcemap/sourcemap-fullpath.js
mv test/fixtures/sourcemap/sourcemap-fullpath.js.map test/expected/sourcemap/sourcemap-fullpath.js.map

node_modules/typescript/bin/tsc test/fixtures/es5.ts --target ES5
mv test/fixtures/es5.js test/expected/es5.js

node_modules/typescript/bin/tsc test/fixtures/no-module.ts
mv test/fixtures/no-module.js test/expected/no-module.js

node_modules/typescript/bin/tsc test/fixtures/amd.ts --module amd
mv test/fixtures/amd.js test/expected/amd.js

node_modules/typescript/bin/tsc test/fixtures/commonjs.ts --module commonjs
mv test/fixtures/commonjs.js test/expected/commonjs.js

node_modules/typescript/bin/tsc test/fixtures/single/dir/single2.ts test/fixtures/single/single1.ts -out test/temp/single.js
mv test/temp/single.js test/expected/single/single.js

node_modules/typescript/bin/tsc test/fixtures/multi/multi1.ts -out test/temp/multi
node_modules/typescript/bin/tsc test/fixtures/multi/dir/multi2.ts -out test/temp/multi/dir
mv test/temp/multi/multi1.js test/expected/multi/multi1.js
mv test/temp/multi/dir/multi2.js test/expected/multi/dir/multi2.js

node_modules/typescript/bin/tsc test/fixtures/utf8-with-bom.ts
mv test/fixtures/utf8-with-bom.js test/expected/utf8-with-bom.js

node_modules/typescript/bin/tsc test/fixtures/comments.ts -c
mv test/fixtures/comments.js test/expected/comments.js
