import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";

function generateAndSaveKeys(algorithm: string, keyLength: number | undefined, outputDir: string) {
    const options: Record<string, any> = {
        publicKeyEncoding: { type: "pkcs1", format: "pem" },
        privateKeyEncoding: { type: "pkcs1", format: "pem" },
    };

    // RSAの場合はキー長を指定
    if (algorithm === "rsa" && keyLength) {
        options.modulusLength = keyLength;
    }

    try {
        // キーペアを生成
        const { privateKey:myPrivateKey,publicKey:myPublicKey } = generateKeyPairSync(algorithm, options);
        const { privateKey:youPrivateKey,publicKey:youPublicKey } = generateKeyPairSync(algorithm, options);

        // 保存先ディレクトリを作成
        mkdirSync(outputDir, { recursive: true });

        // ファイルに書き込み
        writeFileSync(`${outputDir}/myPublicKey.pem`, myPublicKey);
        writeFileSync(`${outputDir}/myPrivateKey.pem`, myPrivateKey);
        writeFileSync(`${outputDir}/youPublicKey.pem`, youPublicKey);
        writeFileSync(`${outputDir}/youPrivateKey.pem`, youPrivateKey);


        console.log(`公開鍵が保存されました: ${outputDir}/myPublicKey.pem`);
        console.log(`秘密鍵が保存されました: ${outputDir}/myPrivateKey.pem`);
        console.log(`秘密鍵が保存されました: ${outputDir}/youPrivateKey.pem`);
        console.log(`秘密鍵が保存されました: ${outputDir}/youPrivateKey.pem`);
    } catch (error) {
        console.error("鍵の生成または保存中にエラーが発生しました:", error);
    }
}

// 使用例
generateAndSaveKeys("rsa", 4096, "./key");
