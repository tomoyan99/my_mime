/**
 * 指定されたサイズ（MB）のテキストファイルを作成する関数
 * @param fileName 作成するファイルの名前
 * @param sizeMB ファイルサイズ（MB）
 */
async function createTextFile(fileName: string, sizeMB: number): Promise<void> {
    const sizeBytes = sizeMB * 1024 * 1024; // バイト単位に変換
    const chunkSize = 1024 * 1024; // 1MBごとに書き込み
    const chunk = "A".repeat(chunkSize); // 1MBのデータを準備
    const file = await Deno.open(fileName, { create: true, write: true });

    let bytesWritten = 0;
    while (bytesWritten < sizeBytes) {
        await file.write(new TextEncoder().encode(chunk));
        bytesWritten += chunkSize;
    }

    file.close();
    console.log(`${sizeMB}MB のファイルを作成しました: ${fileName}`);
}

/**
 * ファイルを複数作成するループ処理
 */
async function createMultipleFiles() {
    const fileConfigs = [
        { name: "./bench/1mb.txt", size: 1 }, // 1MBのファイル
        { name: "./bench/50mb.txt", size: 50 }, // 50MBのファイル
        { name: "./bench/100mb.txt", size: 100 }, // 100MBのファイル
        { name: "./bench/500mb.txt", size: 500 }, // 500MBのファイル
    ];

    for (const config of fileConfigs) {
        await createTextFile(config.name, config.size);
    }
}

// 実行
await createMultipleFiles();
