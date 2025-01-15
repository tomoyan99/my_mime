// S/MIMEのハッシュアルゴリズム
type HashAlgorithm_L = "sha1" | "sha224" | "sha256" | "sha384" | "sha512" | "md5" | "unknown";
type HashAlgorithm_U = Uppercase<HashAlgorithm_L>;
type HashAlgorithm_LH = "sha-1" | "sha-224" | "sha-256" | "sha-384" | "sha-512" | "md5" | "unknown";
type HashAlgorithm_UH = Uppercase<HashAlgorithm_LH>;

// ハッシュアルゴリズムの変換タイプを定義
export type HashAlgorithmFormat<T extends "UC" | "UC_Hyphen" | "LC" | "LC_Hyphen"> =
    T extends "UC" ? HashAlgorithm_U:
    T extends "UC_Hyphen" ? HashAlgorithm_UH:
    T extends "LC" ? HashAlgorithm_L:
    T extends "LC_Hyphen" ? HashAlgorithm_LH:
    never;

class HashAlgorithmFormats {
    private algorithm: HashAlgorithmFormat<"LC_Hyphen">;

    constructor(algorithm: HashAlgorithmFormat<"LC_Hyphen">) {
        this.algorithm = algorithm;
    }

    // 大文字に変換
    UC(): HashAlgorithmFormat<"UC"> {
        return <HashAlgorithmFormat<"UC">>this.algorithm.replace("-","").toUpperCase();
    }

    // 小文字に変換
    LC(): HashAlgorithmFormat<"LC"> {
        return <HashAlgorithmFormat<"LC">>this.algorithm.replace("-","").toLowerCase();
    }

    // 大文字でハイフン付きに変換
    UC_Hyphen(): HashAlgorithmFormat<"UC_Hyphen"> {
        return <HashAlgorithmFormat<"UC_Hyphen">>this.algorithm.toUpperCase();
    }

    // 小文字でハイフン付きに変換
    LC_Hyphen(): HashAlgorithmFormat<"LC_Hyphen"> {
        return <HashAlgorithmFormat<"LC_Hyphen">>this.algorithm.toLowerCase();
    }
}

export class Micalg {
    private formats: HashAlgorithmFormats;

    constructor(algorithm: HashAlgorithmFormat<"LC_Hyphen">) {
        this.formats = new HashAlgorithmFormats(algorithm);
    }

    // 大文字
    UC(): string {
        return this.formats.UC();
    }

    // 小文字
    LC(): string {
        return this.formats.LC();
    }

    // 大文字でハイフン付き
    UC_Hyphen(): string {
        return this.formats.UC_Hyphen();
    }

    // 小文字でハイフン付き
    LC_Hyphen(): string {
        return this.formats.LC_Hyphen();
    }
}
