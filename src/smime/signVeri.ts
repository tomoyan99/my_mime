// signVeriHandler.ts
import { readTextFile } from "node:fs";
import { createSign, createVerify } from "node:crypto";
import {HashAlgorithmFormat} from "./Micalg.ts";

// 秘密鍵を使ってメッセージに署名
export async function signMessage(
    message: string,
    privateKeyPath: string,
    algorithm:HashAlgorithmFormat<"UC">="SHA256"
): Promise<string> {
    const privateKey = await readTextFile(privateKeyPath);
    const sign = createSign(algorithm);
    sign.update(message);
    sign.end();
    const signature = sign.sign(privateKey, "base64");
    return signature;
}

// 公開鍵を使って署名を検証
export async function verifyMessage(
    message: string,
    signature: string,
    publicKeyPath: string,
    algorithm:HashAlgorithmFormat<"UC">="SHA256"
): Promise<boolean> {
    const publicKey = await readTextFile(publicKeyPath);
    const verify = createVerify(algorithm);
    verify.update(message);
    verify.end();
    return verify.verify(publicKey, signature, "base64");
}
