///<reference path="./tsc.d.ts" />
///<reference path="./grunt.d.ts" />

module GruntTs{

    declare var process: any;

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

    var _fs: any = require('fs');
    var _path: any = require('path');

    function writeError(str: string): void{
        console.log('>> '.red + str.trim().replace(/\n/g, '\n>> '.red));
    }
    function writeInfo(str: string): void{
        console.log('>> '.cyan + str.trim().replace(/\n/g, '\n>> '.cyan));
    }

    function currentPath(): string{
        return _path.resolve(".");
    }

    export class GruntIO implements IIO {
        private _createdFiles: CreatedFile[] = [];

        public stderr: ITextWriter;
        public stdout: ITextWriter;
        public arguments: string[];

        constructor(private grunt: any,
                    private destPath: string,
                    private basePath: string,
                    private outputOne: boolean){
            var self: GruntIO = this;
            this.stderr = {
                Write: (str: string): void => writeError(str),
                WriteLine: (str: string): void => writeError(str),
                Close: (): void => {}
            };
            this.stdout = {
                Write: (str: string): void => writeInfo(str),
                WriteLine: (str: string): void => writeInfo(str),
                Close: (): void => {}
            };
            this.arguments = <string[]>process.argv.slice(2);
        }

        getCreatedFiles(): CreatedFile[] {
            return this._createdFiles;
        }

        currentPath(): string{
            return currentPath();
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

        dirName(path: string): string {
            var dirPath: string = _path.dirname(path);
            if (dirPath === path) {
                dirPath = null;
            }
            return dirPath;
        }

        writeFile(path: string, contents: string, writeByteOrderMark: boolean): void {
            var created = (function(): CreatedFile{
                var source: string, type: CodeType;
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
                var g = _path.join(currentPath(), this.basePath || "");
                path = path.substr(g.length);
                path = _path.join(currentPath(), this.destPath ? this.destPath.toString() : '', path);
            }
            if (writeByteOrderMark) {
                contents = '\uFEFF' + contents;
            }

            this.grunt.file.write(path, contents);
            created.dest = path;

            this._createdFiles.push(created);
        }

        findFile(rootPath: string, partialFilePath: string): {fileInformation: FileInformation; path: string;}{
            var path: string = rootPath + "/" + partialFilePath;

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

        directoryExists(path: string): boolean {
            return _fs.existsSync(path) && _fs.lstatSync(path).isDirectory();
        }

        fileExists(path: string): boolean {
            return _fs.existsSync(path);
        }

        combine(left: string, right:string): string{
            return _path.join(left, right);
        }

        createDirectory(path: string): void{
            if (!this.directoryExists(path)) {
                _fs.mkdirSync(path);
            }
        }

        print(str: string): void{
            this.stdout.Write(str);
        }

        printLine(str: string): void{
            this.stdout.WriteLine(str);
        }

        deleteFile(path: string): void{
            //dummy
        }

        dir(path: string, re?: RegExp, options?: { recursive?: boolean; }): string[]{
            return null;
        }

        watchFile(fileName: string, callback: (x:string) => void ): IFileWatcher{
            return null;
        }

        run(source: string, fileName: string): void{
            return;
        }

        getExecutingFilePath(): string{
            return null;
        }

        quit(exitCode?: number): void{
            return;
        }
    }
}