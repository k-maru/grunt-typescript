///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/tsc/tsc.d.ts" />


module GruntTs{

    declare var process: any;

    var _fs: any = require('fs');
    var _path: any = require('path');
    var _os = require('os');

    function writeError(str: string): void{
        console.log('>> '.red + str.trim().replace(/\n/g, '\n>> '.red));
    }
    function writeInfo(str: string): void{
        console.log('>> '.cyan + str.trim().replace(/\n/g, '\n>> '.cyan));
    }

    function normalizePath(path: string): string{
        if(Object.prototype.toString.call(path) === "[object String]"){
            return path.replace(/\\/g, "/");
        }
        return path;
    }

    var _currentPath = normalizePath(_path.resolve("."));

    function currentPath(): string{
        return _currentPath;
    }

    function readFile(file: string, codepage: number): TypeScript.FileInformation {
        if (codepage !== null) {
            throw new Error(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.codepage_option_not_supported_on_current_platform, null));
        }

        var buffer = _fs.readFileSync(file);
        switch (buffer[0]) {
            case 0xFE:
                if (buffer[1] === 0xFF) {
                    // utf16-be. Reading the buffer as big endian is not supported, so convert it to
                    // Little Endian first
                    var i = 0;
                    while ((i + 1) < buffer.length) {
                        var temp = buffer[i];
                        buffer[i] = buffer[i + 1];
                        buffer[i + 1] = temp;
                        i += 2;
                    }
                    return new TypeScript.FileInformation(buffer.toString("ucs2", 2), TypeScript.ByteOrderMark.Utf16BigEndian);
                }
                break;
            case 0xFF:
                if (buffer[1] === 0xFE) {
                    // utf16-le
                    return new TypeScript.FileInformation(buffer.toString("ucs2", 2), TypeScript.ByteOrderMark.Utf16LittleEndian);
                }
                break;
            case 0xEF:
                if (buffer[1] === 0xBB) {
                    // utf-8
                    return new TypeScript.FileInformation(buffer.toString("utf8", 3), TypeScript.ByteOrderMark.Utf8);
                }
        }

        // Default behaviour
        return new TypeScript.FileInformation(buffer.toString("utf8", 0), TypeScript.ByteOrderMark.None);
    }

    function writeFile(path: string, contents: string, writeByteOrderMark: boolean) {
        function mkdirRecursiveSync(path: string) {
            var stats = _fs.statSync(path);
            if (stats.isFile()) {
                throw "\"" + path + "\" exists but isn't a directory.";
            } else if (stats.isDirectory()) {
                return;
            } else {
                mkdirRecursiveSync(_path.dirname(path));
                _fs.mkdirSync(path, 509 /*775 in octal*/);
            }
        }
        mkdirRecursiveSync(_path.dirname(path));

        if (writeByteOrderMark) {
            contents = '\uFEFF' + contents;
        }

        var chunkLength = 4 * 1024;
        var fileDescriptor = _fs.openSync(path, "w");
        try {
            for (var index = 0; index < contents.length; index += chunkLength) {
                var buffer = new Buffer(contents.substr(index, chunkLength), "utf8");

                _fs.writeSync(fileDescriptor, buffer, 0, buffer.length, null);
            }
        }
        finally {
            _fs.closeSync(fileDescriptor);
        }
    }

    export class GruntIO implements TypeScript.IIO {

        constructor(private grunt: any){
        }

        stderr: ITextWriter = {
            Write: (str: string): void => writeError(str),
            WriteLine: (str: string): void => writeError(str),
            Close: (): void => {}
        };

        stdout: ITextWriter = {
            Write: (str: string): void => writeInfo(str),
            WriteLine: (str: string): void => writeInfo(str),
            Close: (): void => {}
        };

        arguments = <string[]>process.argv.slice(2);

        readFile(file: string, codepage: number): TypeScript.FileInformation {

            var result: TypeScript.FileInformation;
            try{
                this.grunt.verbose.write("Reading " + file + "...");
                result = readFile(file, codepage);
                this.grunt.verbose.writeln("OK".green);
                return result;
            }catch(e){
                this.grunt.verbose.writeln("");
                this.grunt.verbose.fail("Can't read file. " + e.message);
                throw e;
            }
        }

        writeFile(path: string, contents: string, writeByteOrderMark: boolean) {
            //TODO: パスの調整

            try{
                this.grunt.verbose.write("Writing " + path + "...");
                writeFile(path, contents, writeByteOrderMark);
                this.grunt.verbose.writeln("OK".green);
            }catch(e){
                this.grunt.verbose.writeln("");
                this.grunt.verbose.fail("Can't write file. " + e.message);
                throw e;
            }
        }

        appendFile(path: string, content: string) {
            this.grunt.verbose.write("Append " + path + "...");
            _fs.appendFileSync(path, content);
        }

        deleteFile(path: string) {
            try {
                this.grunt.verbose.write("Deleting " + path + "...");
                _fs.unlinkSync(path);
                this.grunt.verbose.writeln("OK".green);
            } catch (e) {
                this.grunt.verbose.writeln("");
                this.grunt.verbose.fail("Can't delete file. " + e.message);
                throw e;
            }
        }

        fileExists(path: string): boolean {
            return _fs.existsSync(path);
        }

        dir(path: string, re?: RegExp, options?: {recursive?: boolean;}): string[] {
            var opts = options || {};

            function filesInFolder(folder: string): string[]{
                var paths: string[] = [];

                try {
                    var files = _fs.readdirSync(folder);
                    for (var i = 0; i < files.length; i++) {
                        var stat = _fs.statSync(folder + "/" + files[i]);
                        if (opts.recursive && stat.isDirectory()) {
                            paths = paths.concat(filesInFolder(folder + "/" + files[i]));
                        } else if (stat.isFile() && (!re || files[i].match(re))) {
                            paths.push(folder + "/" + files[i]);
                        }
                    }
                } catch (err) {
                }

                return paths;
            }

            return filesInFolder(path);
        }

        createDirectory(path: string): void {
            if (!this.directoryExists(path)) {
                _fs.mkdirSync(path);
            }
        }

        directoryExists(path: string): boolean {
            return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
        }

        resolvePath(path: string): string {
            return _path.resolve(path);
        }

        dirName(path: string): string {
            var dirPath = _path.dirname(path);

            // Node will just continue to repeat the root path, rather than return null
            if (dirPath === path) {
                dirPath = null;
            }

            return dirPath;
        }

        findFile(rootPath: string, partialFilePath: string): TypeScript.IFindFileResult {
            var path = rootPath + "/" + partialFilePath;

            while (true) {
                if (_fs.existsSync(path)) {
                    return { fileInformation: this.readFile(path, null), path: path };
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

        print(str: string): void{
            this.stdout.Write(str);
        }

        printLine(str: string): void{
            this.stdout.WriteLine(str);
        }

        watchFile(fileName: string, callback: (x:string) => void ): TypeScript.IFileWatcher{
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

        //original method
        currentPath(): string{
            return currentPath();
        }

        //original method
        combine(left: string, right:string): string{
            return normalizePath(_path.join(left, right));
        }
        //original
        newLine = _os.EOL;

        //original
        relativePath(from: string, to: string): string{
            return normalizePath(_path.relative(from, to));
        }

        //original
        resolveMulti(...paths: string[]): string{
            return normalizePath(_path.resolve.apply(_path, paths));
        }

        //original
        writeWarn(message: string){
            this.grunt.log.writeln(message.yellow);
        }

        normalizePath(path: string): string{
            return normalizePath(path);
        }
    }
}