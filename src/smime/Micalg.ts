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
    // 各ハッシュアルゴリズムを静的プロパティとして持つ
    static sha1 = new HashAlgorithmFormats("sha-1");
    static sha224 = new HashAlgorithmFormats("sha-224");
    static sha256 = new HashAlgorithmFormats("sha-256");
    static sha384 = new HashAlgorithmFormats("sha-384");
    static sha512 = new HashAlgorithmFormats("sha-512");
    static md5 = new HashAlgorithmFormats("md5");
    static unknown = new HashAlgorithmFormats("unknown");
}