import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";

/**
 * 公開鍵・秘密鍵を生成し、指定したディレクトリに保存する
 * @param algorithm キー生成アルゴリズム (例: "rsa", "ec", "ed25519")
 * @param keyLength キーの長さ (RSAの場合に必要: 例 2048, 4096)
 * @param outputDir 保存先ディレクトリ
 */
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
        const { privateKey, publicKey } = generateKeyPairSync(algorithm, options);

        // 保存先ディレクトリを作成
        mkdirSync(outputDir, { recursive: true });

        // ファイルに書き込み
        writeFileSync(`${outputDir}/myPublicKey.pem`, publicKey);
        writeFileSync(`${outputDir}/myPrivateKey.pem`, privateKey);

        console.log(`公開鍵が保存されました: ${outputDir}/myPublicKey.pem`);
        console.log(`秘密鍵が保存されました: ${outputDir}/myPrivateKey.pem`);
    } catch (error) {
        console.error("鍵の生成または保存中にエラーが発生しました:", error);
    }
}

// 使用例
generateAndSaveKeys("rsa", 4096, "./key");
