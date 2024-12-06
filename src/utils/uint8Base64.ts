import { Buffer } from "node:buffer";

// uint8Arrayをbase64に
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    const binaryString = String.fromCharCode(...uint8Array);
    return Buffer.from(binaryString, 'binary').toString('base64');
}

export function base64ToUint8Array(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

export function decodeBase64(str:string){
    // base64エンコードされた文字列にはプレフィックスにbase64?をつけてる
    const [prefix,rawStr] = str.split("?");
    if (rawStr) {
        return Buffer.from(rawStr, "base64").toString("utf-8");
    }else{
        return str;
    }
}