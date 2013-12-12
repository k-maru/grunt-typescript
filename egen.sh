mkdir test/expected/multi/dir -p
mkdir test/expected/single
mkdir test/expected/sourcemap

CURDIR=`pwd | cut -c 0-2`:`pwd | cut -c 3-`

echo Simple
node_modules/typescript/bin/tsc test/fixtures/simple.ts
mv test/fixtures/simple.js test/expected/simple.js -f

echo Declaration
node_modules/typescript/bin/tsc test/fixtures/declaration.ts --declaration
mv test/fixtures/declaration.js test/expected/declaration.js
mv test/fixtures/declaration.d.ts test/expected/declaration.d.ts

echo SourceMap
node_modules/typescript/bin/tsc test/fixtures/sourcemap.ts --outDir test/fixtures/sourcemap --sourcemap
mv test/fixtures/sourcemap/sourcemap.js test/expected/sourcemap/sourcemap.js
mv test/fixtures/sourcemap/sourcemap.js.map test/expected/sourcemap/sourcemap.js.map

echo Target ES5
node_modules/typescript/bin/tsc test/fixtures/es5.ts --target ES5
mv test/fixtures/es5.js test/expected/es5.js

# echo No Module
# node_modules/typescript/bin/tsc test/fixtures/no-module.ts
# mv test/fixtures/no-module.js test/expected/no-module.js

echo AMD
node_modules/typescript/bin/tsc test/fixtures/amd.ts --module amd
mv test/fixtures/amd.js test/expected/amd.js

echo CommonJS
node_modules/typescript/bin/tsc test/fixtures/commonjs.ts --module commonjs
mv test/fixtures/commonjs.js test/expected/commonjs.js

echo Single
node_modules/typescript/bin/tsc test/fixtures/single/dir/single2.ts test/fixtures/single/single1.ts --out test/temp/single.js
mv test/temp/single.js test/expected/single/single.js

echo Single-SourceMap
node_modules/typescript/bin/tsc test/fixtures/single/dir/single2.ts test/fixtures/single/single1.ts --out test/temp/single-sourcemap.js --sourcemap
mv test/temp/single-sourcemap.js test/expected/single/single-sourcemap.js
mv test/temp/single-sourcemap.js.map test/expected/single/single-sourcemap.js.map

echo Multi
node_modules/typescript/bin/tsc test/fixtures/multi/multi1.ts --outDir test/temp/multi
node_modules/typescript/bin/tsc test/fixtures/multi/dir/multi2.ts --outDir test/temp/multi/dir
mv test/temp/multi/multi1.js test/expected/multi/multi1.js
mv test/temp/multi/dir/multi2.js test/expected/multi/dir/multi2.js

echo BOM
node_modules/typescript/bin/tsc test/fixtures/utf8-with-bom.ts
mv test/fixtures/utf8-with-bom.js test/expected/utf8-with-bom.js

echo Comment
node_modules/typescript/bin/tsc test/fixtures/comments.ts
mv test/fixtures/comments.js test/expected/comments.js

echo NewLine
node_modules/typescript/bin/tsc test/fixtures/newline.ts
perl -pe 's/\r\n/\n/' test/fixtures/newline.js > test/expected/newline_lf.js
perl -pe 's/\n/\r\n/' test/expected/newline_lf.js > test/expected/newline_crlf.js
mv test/fixtures/newline.js test/expected/newline_auto.js
