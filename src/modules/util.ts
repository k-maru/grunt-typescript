///<reference path="../../typings/node.d.ts" />

let _path: NodeJS.Path = require("path"),
	_fs: NodeJS.FileSystem = require("fs"),
	_os: NodeJS.OS = require("os");

/**
 * string 型かどうか
 */
export function isStr(val: any): boolean{
    return Object.prototype.toString.call(val) === "[object String]";
}
/**
 * boolean 型かどうか
 */
export function isBool(val: any): boolean{
    return Object.prototype.toString.call(val) === "[object Boolean]";
}
/**
 * 配列かどうか
 */
export function isArray(val: any): boolean{
    return Object.prototype.toString.call(val) === "[object Array]";
}
/**
 * undefined かどうか
 */
export function isUndef(val: any): boolean{
    return typeof val === "undefined";
}
/**
 * bin ディレクトリのパス
 */
export function getBinDir(): string{
    return _path.dirname(require.resolve("typescript"));
}

//ts

var hasOwnProperty = Object.prototype.hasOwnProperty;

export function hasProperty<T>(value: any, key: string): boolean {
    return hasOwnProperty.call(value, key);
}

const colonCode = 0x3A;
const slashCode = 0x2F;

export function getRootLength(path: string): number {
    if (path.charCodeAt(0) === slashCode) {
        if (path.charCodeAt(1) !== slashCode) return 1;
        let p1 = path.indexOf("/", 2);
        if (p1 < 0) return 2;
        let p2 = path.indexOf("/", p1 + 1);
        if (p2 < 0) return p1 + 1;
        return p2 + 1;
    }
    if (path.charCodeAt(1) === colonCode) {
        if (path.charCodeAt(2) === slashCode) return 3;
        return 2;
    }
    let idx = path.indexOf("://");
    if(idx !== -1) return idx + 3;
    
    return 0;
}

/**
 * パスの区切り文字を静音化(バックスラッシュをスラッシュに)
 */
export function normalizeSlashes(path: string): string {
    return path.replace(/\\/g, "/");
}

const directorySeparator = "/";
function getNormalizedParts(normalizedSlashedPath: string, rootLength: number) {
    let parts = normalizedSlashedPath.substr(rootLength).split(directorySeparator);
    let normalized: string[] = [];
    for (let part of parts) {
        if (part !== ".") {
            if (part === ".." && normalized.length > 0 && normalized[normalized.length - 1] !== "..") {
                normalized.pop();
            }
            else {
                if(part){
                    normalized.push(part);    
                }
            }
        }
    }
    return normalized;
}

export function normalizePath(path: string): string {
    let spath = normalizeSlashes(path);
    let rootLength = getRootLength(spath);
    let normalized = getNormalizedParts(spath, rootLength);
    return spath.substr(0, rootLength) + normalized.join(directorySeparator);
}

export function combinePaths(path1: string, path2: string) {
    if (!(path1 && path1.length)) return path2;
    if (!(path2 && path2.length)) return path1;
    //if (path2.charAt(0) === directorySeparator) return path2;
    if (getRootLength(path2) !== 0) return path2;
    if (path1.charAt(path1.length - 1) === directorySeparator) return path1 + path2;
    return path1 + directorySeparator + path2;
}

export function getDirectoryPath(path: string) {
    return path.substr(0, Math.max(getRootLength(path), path.lastIndexOf(directorySeparator)));
}


export function readFile(fileName: string, encoding?: string): string {
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

export function writeFile(fileName: string, data: string, writeByteOrderMark?: boolean): void {
    // If a BOM is required, emit one
    if (writeByteOrderMark) {
        data = '\uFEFF' + data;
    }

    _fs.writeFileSync(fileName, data, "utf8");
}

export function abs(fileName: string): string{
    return normalizePath(_path.resolve(".", normalizePath(fileName)));
}

export function fileExists(path: string): boolean{
    return _fs.existsSync(path);
}

export function directoryExists(path:string):boolean {
    return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
}

export function dirOrFileExists(path:string):boolean {
    return _fs.existsSync(path);
}


export function createDirectory(directoryName:string):void {
    if (!directoryExists(directoryName)) {
        _fs.mkdirSync(directoryName);
    }
}


export function createDirectoryRecurse(directoryName: string) {
    if (directoryName.length > getRootLength(directoryName) && !directoryExists(directoryName)) {
        let parentDirectory = getDirectoryPath(directoryName);
        createDirectoryRecurse(parentDirectory);
        //TODO:
        createDirectory(directoryName);
    }
}

export function getCurrentDirectory(): string {
    return normalizePath(_path.resolve("."))
}

export function relativePath(from: string, to: string): string{
    return _path.relative(from, to);
}

export function write(str: string): void{
    console.log(str);
}

export function writeAbort(str: string): void{
    console.log((str || "").red);
}

export function writeError(str: string): void{
    console.log(">> ".red + str.trim().replace(/\r/g, '').replace(/\n/g, "\n>> ".red));
}

export function writeInfo(str: string): void{
    console.log(">> ".cyan + str.trim().replace(/\r/g, '').replace(/\n/g, "\n>> ".cyan));
}

export function writeWarn(str: string): void{
    console.log(">> ".yellow + str.trim().replace(/\r/g, '').replace(/\n/g, "\n>> ".yellow));
}
