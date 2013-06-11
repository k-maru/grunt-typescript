///<reference path="./tsc.d.ts" />

declare var require: any;

module GruntTs{

    export enum CodeType{
        JS,
        Map,
        Declaration
    }

    export interface CreatedFile{
        source: string;
        dest?: string;
        type: CodeType;
    }

    var _fs = require('fs');
    var _path = require('path');

    export class GruntIO {
        private _createdFiles: CreatedFile[] = [];
        public stderr: {
            Write(str);
            WriteLine(str);
            Close()
        };

        constructor(private grunt: any,
                    private destPath: string,
                    private basePath: string,
                    private outputOne: boolean){
            var self = this;
            this.stderr = {
                Write: (str) => this.grunt.log.error(str),
                WriteLine: (str) => self.grunt.log.error(str),
                Close: () => {}
            };
        }

        getCreatedFiles(): CreatedFile[] {
            return this._createdFiles;
        }

        currentPath(): string{
            return _path.resolve(".");
        }

        resolvePath(path: string): string{
            return _path.resolve(path);
        }

        readFile(file: string): FileInformation{
            this.grunt.verbose.write('Reading ' + file + '...');
            try{
                var buffer = _fs.readFileSync(file, 'utf8');
                switch (buffer[0]) {
                    case 0xFE:
                        if (buffer[1] === 0xFF) {
                            var i = 0;
                            while ((i + 1) < buffer.length) {
                                var temp = buffer[i];
                                buffer[i] = buffer[i + 1];
                                buffer[i + 1] = temp;
                                i += 2;
                            }
                            return new FileInformation(buffer.toString("ucs2", 2), 2 /* Utf16BigEndian */);
                        }
                        break;
                    case 0xFF:
                        if (buffer[1] === 0xFE) {
                            return new FileInformation(buffer.toString("ucs2", 2), 3 /* Utf16LittleEndian */);
                        }
                        break;
                    case 0xEF:
                        if (buffer[1] === 0xBB) {
                            return new FileInformation(buffer.toString("utf8", 3), 1 /* Utf8 */);
                        }
                }
                this.grunt.verbose.ok();
                return new FileInformation(buffer.toString("utf8", 0), 0 /* None */);
            }catch(e){
                this.grunt.verbose.fail("CAN'T READ");
                throw e;
            }
        }

        dirName(path): string {
            var dirPath = _path.dirname(path);
            if (dirPath === path) {
                dirPath = null;
            }
            return dirPath;
        }

        writeFile(path, contents, writeByteOrderMark) {

            var created = (function(): CreatedFile{
                var source, type;
                if (/\.js$/.test(path)) {
                    source = path.substr(0, path.length - 3) + ".ts";
                    type = CodeType.JS;
                }
                else if (/\.js\.map$/.test(path)) {
                    source = path.substr(0, path.length - 7) + ".ts";
                    type = CodeType.Map;
                }
                else if (/\.d\.ts$/.test(path)) {
                    source = path.substr(0, path.length - 5) + ".ts";
                    type = CodeType.Declaration;
                }
                if(this.outputOne){
                    source = "";
                }
                return {
                    source: source,
                    type: type
                };
            })();
            if (contents.trim().length < 1) {
                return;
            }
            if (!this.outputOne) {
                var g = _path.join(this.currentPath(), this.basePath || "");
                path = path.substr(g.length);
                path = _path.join(this.currentPath(), this.destPath ? this.destPath.toString() : '', path);
            }
            if (writeByteOrderMark) {
                contents = '\uFEFF' + contents;
            }
            this.grunt.file.write(path, contents);
            created.dest = path;
            this._createdFiles.push(created);
        }

        findFile(rootPath: string, partialFilePath: string){
            var path = rootPath + "/" + partialFilePath;

            while (true) {
                if (_fs.existsSync(path)) {
                    return { fileInformation: this.readFile(path), path: path };
                }
                else {
                    var parentPath = _path.resolve(rootPath, "..");

                    // Node will just continue to repeat the root path, rather than return null
                    if (rootPath === parentPath) {
                        return null;
                    }
                    else {
                        rootPath = parentPath;
                        path = _path.resolve(rootPath, partialFilePath);
                    }
                }
            }
        }

        directoryExists(path) {
            return _fs.existsSync(path) && _fs.lstatSync(path).isDirectory();
        }

        fileExists(path) {
            return _fs.existsSync(path);
        }

        combine(left: string, right:string): string{
            return _path.join(left, right);
        }

        deleteFile(path: string): void{
            //dummy
        }
    }

}