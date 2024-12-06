import {Buffer} from "node:buffer";
import {base64ToUint8Array, uint8ArrayToBase64} from "../../utils/uint8Base64.ts";
import {UHashAlgorithm} from "../../types/MimeType.d.ts";

export class Key{
    private pem: string;
    private key: Uint8Array;
    private readonly kind:"private"|"public";
    constructor(pem:string,kind:"private"|"public") {
        this.pem = pem;
        this.key = new Uint8Array();
        this.kind = kind;
    }
    public static async register(path:string,kind:"private"|"public"){
        const pem = await Deno.readTextFile(path);
        const instance = new Key(pem,kind);
        const pem64 = instance.pemToBase64();
        const key = base64ToUint8Array(pem64);
        instance.key = key;
        return instance;
    }
    // 鍵をインポートする
    public async importKey(algorithm:UHashAlgorithm): Promise<CryptoKey> {
        const format = <"pkcs8"|"spki">{private:"pkcs8",public:"spki"}[this.kind];
        const usage = <"sign"|"verify">{private:"sign",public:"verify"}[this.kind];

        // // RSAの鍵ペアを生成
        // const keyPair = await crypto.subtle.generateKey(
        //     {
        //         name: "RSA-PSS",    // RSA-PSS (署名アルゴリズム)
        //         modulusLength: 2048, // 鍵の長さ（2048ビット以上推奨）
        //         publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537 (デフォルトの公開指数)
        //         hash: "SHA-256", // ハッシュアルゴリズム
        //     },
        //     true, // 秘密鍵をエクスポート可能にする
        //     ["sign", "verify"] // 使用する鍵の操作
        // );
        // const pri = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
        // const priU = new Uint8Array(pri);
        // console.log(uint8ArrayToBase64(priU))
        // console.log()
        // console.log(uint8ArrayToBase64(this.key))

        // バイナリ形式の鍵をインポート
        return crypto.subtle.importKey(
            format, // 鍵フォーマット(秘密鍵ならpkcs8,公開鍵ならspki)
            this.key.buffer,
            // priU.buffer,
            {
                name: "RSASSA-PKCS1-v1_5", // アルゴリズム
                hash: algorithm, // ハッシュアルゴリズム
            },
            false, // エクスポート不可
            [usage] // 使用目的(秘密鍵ならsign,公開鍵ならverify)
        );
    }
    private pemToBase64(): string {
        return this.pem
            .replace(/-----BEGIN [A-Z ]+-----/g, "") // ヘッダー部分を削除
            .replace(/-----END [A-Z ]+-----/g, "")   // フッター部分を削除
            .replace(/\s+/g, "");                    // 改行や空白を削除
    }

}