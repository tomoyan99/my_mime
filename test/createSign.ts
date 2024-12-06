// PEM形式の秘密鍵を読み込んで署名を生成する
async function createSignature(fileContent: string, privateKeyStr: string): Promise<Uint8Array> {

    // ファイルの内容をハッシュ化（SHA-256）
    const encoder = new TextEncoder();
    const fileData = encoder.encode(fileContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileData);

    // PEM形式から秘密鍵をインポート
    const privateKey = await importPrivateKey(privateKeyStr);

    // ハッシュ値を秘密鍵で署名
    const signature = await crypto.subtle.sign(
        {
            name: "RSASSA-PKCS1-v1_5", // 署名アルゴリズム
        },
        privateKey,
        hashBuffer // ハッシュ化されたデータ
    );

    // 署名をUint8Array形式で返す
    return new Uint8Array(signature);
}

// PEM形式の秘密鍵をインポートする
function importKey(kind:"private"|"public",key:Uint8Array): Promise<CryptoKey> {
    const format = <"pkcs8"|"spki">{private:"pkcs8",public:"spki"}[kind];
    const usage = <"sign"|"verify">{private:"sign",public:"verify"}[kind]
    // バイナリ形式の鍵をインポート
    return crypto.subtle.importKey(
        format, // 秘密鍵フォーマット
        key.buffer,
        {
            name: "RSASSA-PKCS1-v1_5", // アルゴリズム
            hash: "SHA-256", // ハッシュアルゴリズム
        },
        false, // エクスポート不可
        [usage] // 使用目的
    );
}



// 使用例
const privateKeyPEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1Jf/lGgciDTjk
ZAvz5otHZP1kz2DaEQwBS/V8HhvBeLetAHYMJAjv2SCAhhVJI0Jz20kb69XW9fTn
2pluXu1jKA2AtG+EQ49iMKjzfXkmvNFs1xvQ5dEAGDn6rCrFrihnkOk0MDKNB5LH
FpVRCLn3MBOlh7VDACBddQDgGmV/dUfuL3hYcL3QwhxI3ggxr2kYWQXQMhBpEYFN
VkAsln6h0+JOdHoTtU6SpJn+bsSrLqQGPactSqfF5vp4XFuZ9MwVQ6mEvQtIP5s5
j0skUfH4VfRXl7QVk/Jy6WC4W7oAOa+OjMMV9f74YaHt+rL2sxj7o8XoaEegdsVT
jxuhUJ3VAgMBAAECggEAMID4P9P0TP3VWfIf8TKt4HP+FVwhxsIBwOch2BYHwIoe
REh3U1Diw7YTqdY9JNQ4GuWAceV34JMC/IHfy1nHnmE/HFMz+OpOHjCBTJEwO1sb
iFUgsZKXn7rc623mFgBH+VMn3j15i6GXf49gc84uXS2WVSA9PK9v+xY1IcxvmOzO
jJGwrRhdoE+nGA46FVfXgTuBmLF5GxyIhHvwaYWBdGo6IVM2FKo18qDpbBypydFV
oD3J9cPEjcYfssiLgU7X+oWa+5ajpG5FKQVDm5MEDwe5MCYDwPufjSqE1/C/8wpq
5RKIA8ZGJ/JsHdcY/RaFuyoGsvfOGe8kJnFs2XsoEQKBgQDrLO4+NDrEvb0ctx6B
RZIT17Xb20caRotzGN1zgB5fALNWkGyruuqTgC3YEka6yc8tojwxWxOaAxqf9Icg
TpoGbcf4Wa2Eeq3A5Yuh5ty+hhLX5xvnIPWCaNfO6eTacFqzBuJ0dC5hxMAwT+Tb
zUEgPSwHJGTXy71PZFx9mCk5nwKBgQDFMFuVxnqOzSaeeN63IRJ3faHHzU8SMdjO
pHJtAoOEfu+qj1PZq1vgwbfhTVgYQfZCBh9ONIRH6ugqxJpCraWuHhgeKA+YnVdb
05mBbiUz4iFhENpHDBYdSBGoLbvKjrpPzxHtrARGOLLy/CnucUlQ5ISsMcyvWnRH
z7jItWpcCwKBgQDKnEUNVlYjVgxtht5DJTr62WcWaU5StuBBYvS3I3QHCUV4mKjn
MvwR4+abNvO0zVUuzYzqQLscfvwbPsKD9PQCAea8chZqAn9bpuerrogTpNLrK3MA
p4acudLjsuK1xwJ9JrtG9SlYlfe2J77WF3m6Wrlp1dMDj8YjdiWxFry9pQKBgD7u
tAwVEEBLESw6fzoLAA3KtrtBtx6jcgJhUXOg/cBnkq3omGY73lLZAIqTWK5FPwbL
VWpsMFuTiQ09Oc5WBS6QxDm7p16ZuKvB2JgKQy1P2j9UVZWfMd+ehKQcFHcNHkEi
YSJtZ9/RcKtD9032MePzSrR6IE1GnR3eGadU3uEJAoGAUoNtmui8zYRI6RzRxPxc
h5cDKzFx9E1wSvMRPz3l1xahEfB98tc+RmNd/x7yWarDUA5xlePfOx9Fy/f7ts1V
/bHfDl/B52bbCRv/N2FbiHvJOY63w1EUEnHdipNnLusi8gSWkk3fcaRVTLjdEgnp
TQ/xqizlg7qMvjyZJaZHkbQ=
-----END PRIVATE KEY-----`; // ここに秘密鍵を挿入

const filePath = "../text/Hello.txt"; // 対象ファイルのパス

(async () => {
    try {
        const signature = await signFileWithPrivateKey(filePath, privateKeyPEM);

    } catch (error) {
        console.error("エラー:", error);
    }
})();
