///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/typescript/tsc.d.ts" />

module GruntTs {

    var _fs:any = require('fs'),
        _os = require('os'),
        _path:any = require('path');

    export interface GruntIO {
        readFile(fileName:string, encoding:string): string;
        writeFile(fileName:string, data:string, writeByteOrderMark?:boolean): void;
        directoryExists(path:string): boolean;
        createDirectory(directoryName:string): void;
        abs(fileName: string): string;
        currentPath(): string;
    }

    export function createIO(grunt:IGrunt):GruntIO {

        var currentPath = ts.normalizePath(_path.resolve("."));

        function readFile(fileName:string, encoding?:string):string {
            if (!_fs.existsSync(fileName)) {
                return undefined;
            }
            var buffer = _fs.readFileSync(fileName);
            var len = buffer.length;
            if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
                // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
                // flip all byte pairs and treat as little endian.
                len &= ~1;
                for (var i = 0; i < len; i += 2) {
                    var temp = buffer[i];
                    buffer[i] = buffer[i + 1];
                    buffer[i + 1] = temp;
                }
                return buffer.toString("utf16le", 2);
            }
            if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
                // Little endian UTF-16 byte order mark detected
                return buffer.toString("utf16le", 2);
            }
            if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                // UTF-8 byte order mark detected
                return buffer.toString("utf8", 3);
            }
            // Default is UTF-8 with no byte order mark
            return buffer.toString("utf8");
        }

        function writeFile(fileName:string, data:string, writeByteOrderMark?:boolean):void {
            // If a BOM is required, emit one
            if (writeByteOrderMark) {
                data = '\uFEFF' + data;
            }

            _fs.writeFileSync(fileName, data, "utf8");
        }

        function directoryExists(path:string):boolean {
            return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
        }

        function createDirectory(directoryName:string):void {
            if (!directoryExists(directoryName)) {
                _fs.mkdirSync(directoryName);
            }
        }

        function abs(fileName: string): string{
            return ts.normalizePath(_path.resolve(".", ts.normalizePath(fileName)));
        }


        return {
            readFile: readFile,
            writeFile: writeFile,
            createDirectory: createDirectory,
            directoryExists: directoryExists,
            abs: abs,
            currentPath: () => {
                return currentPath;
            }
        };
    }
}