import { Buffer } from "node:buffer";

// uint8Arrayをbase64に
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    const binaryString = String.fromCharCode(...uint8Array);
    return Buffer.from(binaryString, 'binary').toString('base64');
}

export function base64ToUint8Array(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}