// PEM形式の公開鍵で署名を検証する
async function verifySignatureWithPublicKey(
    filePath: string,
    signature: Uint8Array,
    publicKeyPEM: string
): Promise<boolean> {
    // ファイル内容を読み込む
    const fileContent = await Deno.readTextFile(filePath);

    // ファイルの内容をハッシュ化（SHA-256）
    const encoder = new TextEncoder();
    const fileData = encoder.encode(fileContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileData);

    // PEM形式から公開鍵をインポート
    const publicKey = await importPublicKey(publicKeyPEM);

    // 署名を検証
    const isValid = await crypto.subtle.verify(
        {
            name: "RSASSA-PKCS1-v1_5", // 署名アルゴリズム
        },
        publicKey, // 公開鍵
        signature.buffer, // 検証対象の署名
        hashBuffer // ハッシュ化されたデータ
    );

    return isValid;
}

// PEM形式の公開鍵をWeb Crypto APIにインポートする
async function importPublicKey(pem: string): Promise<CryptoKey> {
    // ヘッダーとフッターを削除してBase64デコード
    const base64Key = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\n/g, "");
    const binaryKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));

    // バイナリ形式の鍵をインポート
    return crypto.subtle.importKey(
        "spki", // 公開鍵フォーマット
        binaryKey.buffer,
        {
            name: "RSASSA-PKCS1-v1_5", // アルゴリズム
            hash: "SHA-256", // ハッシュアルゴリズム
        },
        false, // エクスポート不可
        ["verify"] // 使用目的
    );
}

function hexToUint8Array(hex: string): Uint8Array {
    // 16進数文字列を2文字ずつ分割し、数値に変換
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

// 使用例
const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtSX/5RoHIg045GQL8+aL
R2T9ZM9g2hEMAUv1fB4bwXi3rQB2DCQI79kggIYVSSNCc9tJG+vV1vX059qZbl7t
YygNgLRvhEOPYjCo8315JrzRbNcb0OXRABg5+qwqxa4oZ5DpNDAyjQeSxxaVUQi5
9zATpYe1QwAgXXUA4Bplf3VH7i94WHC90MIcSN4IMa9pGFkF0DIQaRGBTVZALJZ+
odPiTnR6E7VOkqSZ/m7Eqy6kBj2nLUqnxeb6eFxbmfTMFUOphL0LSD+bOY9LJFHx
+FX0V5e0FZPyculguFu6ADmvjozDFfX++GGh7fqy9rMY+6PF6GhHoHbFU48boVCd
1QIDAQAB
-----END PUBLIC KEY-----`; // ここに公開鍵を挿入

const filePath = "../text/Hello.txt"; // 対象ファイルのパス
const signature = hexToUint8Array(`3a04e3780de17030b35ecf34d7791ef2412200bb85f28abc64f1257c47766020712abb2d18e8bc1b86718992dec24954836090fde89ced4ac48d76e3b397b57734bf51003e5bdd4cac7bc60ec5f1aaac202f6ab94fbe86a184e3d135972d9792bfddb5197af45f43b0b9a689f35badf80e4e18b613d8fb934ff4050989ae86f68ae215ebb7602a02c1aefff87aed829d63222010264d9d7db43184204965c8e1cdd328b9666955728fb8ee09eb9a81a50bc092319461e5686f3cc37724714fa747bf22018bdca852b9680a7c27c66200674e8faf5c41ee258dcc45f86617f3b9c5408db535838ee413442f40f5bea274ce74cce7d6c886c7b3220337b94034`);

(async () => {
    try {
        const isValid = await verifySignatureWithPublicKey(filePath, signature, publicKeyPEM);
        console.log("署名が有効か:", isValid);
    } catch (error) {
        console.error("エラー:", error);
    }
})();
