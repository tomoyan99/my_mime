import { Buffer } from "npm:buffer";
import {Charset} from "../types/Charset.ts";

// uint8Arrayをbase64に
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    const binaryString = String.fromCharCode(...uint8Array);
    return Buffer.from(binaryString, 'binary').toString('base64');
}

export function base64ToUint8Array(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

export function decodeBase64(fieldValue:string,flag:boolean=false){
    // メッセージのとき
    if(flag){
        return Buffer.from(fieldValue,"base64").toString("utf-8");
    }
    if (fieldValue.startsWith("=?") && fieldValue.endsWith("?=")) {
        // MIMEヘッダーの最初と最後を取り除いて分割
        const content = fieldValue.slice(2, -2);  // "=?charset?b?encoded_text?=" から "charset?b?encoded_text" を取り出す
        // ? で分割して charset, encoding, encoded_text を取得
        const [charset, encoding_ini, encodedText] = content.split('?');
        const encoding = encoding_ini === "b"?"base64":undefined;
        if (encoding){
            // charset:utf-8 encoding:base64
            return Buffer.from(encodedText,encoding).toString(charset);
        }else{
            throw new Error("Unknown encoding");
        }
    }else{
        return fieldValue;
    }
}