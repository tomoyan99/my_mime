// signVeriHandler.ts
import { createSign, createVerify } from "node:crypto";
import {HashAlgorithmFormat, Micalg} from "./Micalg.ts";

// 秘密鍵を使ってメッセージに署名
export async function signMessage(
    message: string,
    privateKeyPath: string,
    algorithm:HashAlgorithmFormat<"LC_Hyphen">="sha-256"
): Promise<string> {
    const privateKey = await Deno.readTextFile(privateKeyPath);
    const micalg = new Micalg(algorithm);
    const sign = createSign(micalg.UC());
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
    algorithm:HashAlgorithmFormat<"LC_Hyphen">="sha-256"
): Promise<boolean> {
    const publicKey = await Deno.readTextFile(publicKeyPath);
    const micalg = new Micalg(algorithm);
    const verify = createVerify(micalg.UC());
    verify.update(message);
    verify.end();
    return verify.verify(publicKey, signature, "base64");
}
