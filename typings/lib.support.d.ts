interface ArrayBuffer {
    //byteLength: number;
    slice(begin:number, end?:number): ArrayBuffer;
}

interface ArrayBufferConstructor {
    //prototype: ArrayBuffer;
    new (byteLength: number): ArrayBuffer;
    isView(arg: any): boolean;
}
declare var ArrayBuffer: ArrayBufferConstructor;

interface Uint8Array {
    // BYTES_PER_ELEMENT: number;
    // buffer: ArrayBuffer;
    // byteLength: number;
    // byteOffset: number;
    copyWithin(target: number, start: number, end?: number): Uint8Array;
    every(callbackfn: (value: number, index: number, array: Uint8Array) => boolean, thisArg?: any): boolean;
    fill(value: number, start?: number, end?: number): Uint8Array;
    filter(callbackfn: (value: number, index: number, array: Uint8Array) => boolean, thisArg?: any): Uint8Array;
    find(predicate: (value: number, index: number, obj: Array<number>) => boolean, thisArg?: any): number;
    findIndex(predicate: (value: number) => boolean, thisArg?: any): number;
    forEach(callbackfn: (value: number, index: number, array: Uint8Array) => void, thisArg?: any): void;
    indexOf(searchElement: number, fromIndex?: number): number;
    join(separator?: string): string;
    lastIndexOf(searchElement: number, fromIndex?: number): number;
    // length: number;
    map(callbackfn: (value: number, index: number, array: Uint8Array) => number, thisArg?: any): Uint8Array;
    reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: Uint8Array) => number, initialValue?: number): number;
    reduce<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: Uint8Array) => U, initialValue: U): U;
    reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: Uint8Array) => number, initialValue?: number): number;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: Uint8Array) => U, initialValue: U): U;
    reverse(): Uint8Array;
    set(index: number, value: number): void;
    set(array: Uint8Array, offset?: number): void;
    slice(start?: number, end?: number): Uint8Array;
    some(callbackfn: (value: number, index: number, array: Uint8Array) => boolean, thisArg?: any): boolean;
    sort(compareFn?: (a: number, b: number) => number): Uint8Array;
    subarray(begin: number, end?: number): Uint8Array;
    toLocaleString(): string;
    toString(): string;
    //[index: number]: number;
}

interface Uint8ArrayConstructor {
    // prototype: Uint8Array;
    new (length: number): Uint8Array;
    new (array: Uint8Array): Uint8Array;
    new (array: number[]): Uint8Array;
    new (buffer: ArrayBuffer, byteOffset?: number, length?: number): Uint8Array;
    // BYTES_PER_ELEMENT: number;
    of(...items: number[]): Uint8Array;
}
declare var Uint8Array: Uint8ArrayConstructor;

interface Console {
    assert(test?: boolean, message?: string, ...optionalParams: any[]): void;
    clear(): void;
    count(countTitle?: string): void;
    debug(message?: string, ...optionalParams: any[]): void;
    dir(value?: any, ...optionalParams: any[]): void;
    dirxml(value: any): void;
    error(message?: any, ...optionalParams: any[]): void;
    group(groupTitle?: string): void;
    groupCollapsed(groupTitle?: string): void;
    groupEnd(): void;
    info(message?: any, ...optionalParams: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
    profile(reportName?: string): void;
    profileEnd(): void;
    time(timerName?: string): void;
    timeEnd(timerName?: string): void;
    trace(): void;
    warn(message?: any, ...optionalParams: any[]): void;
}

declare var Console: {
    prototype: Console;
    new(): Console;
}
declare var console: Console;