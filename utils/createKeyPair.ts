// ArrayBuffer を Base64 に変換し PEM 形式にする関数
function arrayBufferToPEM(buffer: ArrayBuffer, type: "PUBLIC KEY" | "PRIVATE KEY"): string {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const formattedBase64 = base64.match(/.{1,64}/g)?.join("\n") || ""; // 64文字ごとに改行
    return `-----BEGIN ${type}-----\n${formattedBase64}\n-----END ${type}-----\n`;
}

// 秘密鍵と公開鍵のペアを生成
async function createKeyPair() {
    try {
        // RSAの鍵ペアを生成
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-PSS",    // RSA-PSS (署名アルゴリズム)
                modulusLength: 2048, // 鍵の長さ（2048ビット以上推奨）
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537 (デフォルトの公開指数)
                hash: "SHA-256", // ハッシュアルゴリズム
            },
            true, // 秘密鍵をエクスポート可能にする
            ["sign", "verify"] // 使用する鍵の操作
        );

        // 公開鍵と秘密鍵をエクスポートする
        const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

        // PEM形式に変換
        const publicKeyPEM = arrayBufferToPEM(publicKeyBuffer, "PUBLIC KEY");
        const privateKeyPEM = arrayBufferToPEM(privateKeyBuffer, "PRIVATE KEY");

        // ファイルに保存
        await Deno.writeTextFile("publicKey.pem", publicKeyPEM);
        await Deno.writeTextFile("privateKey.pem", privateKeyPEM);

    } catch (e) {
        throw new Error("key-pair create error");
    }
}

// 関数の実行
createKeyPair();
