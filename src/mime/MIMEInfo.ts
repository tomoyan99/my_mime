import {Buffer} from "node:buffer";
import {Charset} from "../types/Charset.ts";
import {SMIMEType, SMIMEContentType} from "../types/MimeType.d.ts";
import {mime} from "https://deno.land/x/mimetypes@v1.0.0/mod.ts";
import {HashAlgorithmFormat} from "../smime/Micalg.ts";

export type HeaderFieldName =
    | "Message-ID"
    | "From"
    | "To"
    | "Subject"
    | "Date"
    | "MIME-Version"
    | "Content-Type"
    | "Content-Transfer-Encoding"
    | "Content-Disposition"
    | "filename"
    | "name"
    | "size"
    | "charset"
    | "boundary"
    | "protocol"
    | "micalg"
    | "smime-type"
    | "Message" // messageの対応
    | string;


export type TsHeaderFieldName =
    | "message_id"
    | "from"
    | "to"
    | "subject"
    | "date"
    | "mime_version"
    | "content_type"
    | "content_transfer_encoding"
    | "content_disposition"
    | "filename"
    | "name"
    | "size"
    | "charset"
    | "boundary"
    | "protocol"
    | "micalg"
    | "smime_type"
    | "message" // これは本文を示す独自のtype
    | string;

// MIMEヘッダーフィールド名をTypeScript用のプロパティ名に変換するマッピング関数
export function mimeHeaderToProp(fieldName:HeaderFieldName):TsHeaderFieldName{
    const table : Readonly<Record<HeaderFieldName,TsHeaderFieldName>> = {
        "Message-ID": "message_id",
        "From": "from",
        "To": "to",
        "Subject": "subject",
        "Date": "date",
        "MIME-Version": "mime_version",
        "Content-Type": "content_type",
        "Content-Transfer-Encoding": "content_transfer_encoding",
        "Content-Disposition": "content_disposition",
        "filename": "filename",
        "name": "name",
        "size": "size",
        "charset": "charset",
        "boundary": "boundary",
        "protocol": "protocol",
        "micalg": "micalg",
        "smime-type": "smime_type",
        "Message":"message"
    }
    if (fieldName in table) {
        return table[fieldName];
    }else{
        console.log(fieldName);
        throw new Error("Missing fieldName");
    }
}


// Fieldクラス: メールヘッダーやボディのフィールドを保持する汎用クラス
export class Field<T extends string = string>{
    protected name: HeaderFieldName; // フィールド名
    protected value:T; // フィールド値

    // コンストラクタ
    constructor(name:HeaderFieldName, value: T) {
        this.name = name;
        this.value = value;
    }

    // フィールド値を設定
    public setFieldValue(name:HeaderFieldName, value: T): void{
        this.name = name;
        this.value = value;
    }

    // フィールド値をオブジェクトとして返す
    public getFieldValue(){
        return {name:this.name, value:this.value};
    }

    // フィールドを文字列として取得（base64エンコーディング対応）
    public getFieldStr():string{
        const flag:boolean = this.name === "Message"; // フィールド名が存在しない(=メッセージ)時はbase64エンコードする
        // valueをbase64にエンコード
        const value_converted:string = this.encodeMultibyte64(this.value,flag);
        // 正規表現
        const regex:RegExp = new RegExp(`.{1,76}`, 'g');
        // valueを76文字ずつ改行で分割
        const value_sliced76:string = value_converted.match(regex)?.join('\n') || value_converted;

        let str:string = "";
        // メッセージ本文の場合はフィールド名を付けない
        if (this.name === "Message") {
            str = `\n${value_sliced76}\n`;
        } else{
            // 行が80を超えたら改行+タブ
            if (`${this.name}: ${value_sliced76}`.length > 80){
                str = `${this.name}: \n\t${value_sliced76}`;
            }else{
                str = `${this.name}: ${value_sliced76}`;
            }
        }
        return str;
    }

    // マルチバイト文字をbase64エンコードする
    protected encodeMultibyte64(str: string,flag:boolean=false): string {
        // マルチバイト文字が混じっているかの検出
        const is_multibyte:boolean = str.length !== Buffer.byteLength(str, "utf-8");
        if (is_multibyte || flag) {
            let prefix = "";
            let suffix = "";
            if(!flag){
                prefix = "=?utf-8?b?";
                suffix = "?=";
            }
            const chunkSize = 1024 * 1024; // 100MBごと
            let base64str = "";
            // strをチャンクごとにBase64に変換
            for (let i = 0; i < str.length; i += chunkSize) {
                const chunk = str.slice(i, i + chunkSize);
                const encoded = Buffer.from(chunk, "utf-8").toString("base64");
                base64str += encoded;
            }
            base64str = prefix+base64str+suffix;
            return base64str;
        } else {
            return str;
        }
    }
}

// MultiFieldクラス: 複数のフィールドを持つフィールドを定義
export class MultiField<T extends Record<string, Field>, U extends string = string> extends Field<U> {
    parameter: T; // 追加のパラメータ

    constructor(name:HeaderFieldName, value: U, param?: T) {
        super(name, value);
        this.parameter = param??<T>{};
    }

    // フィールドを文字列として取得（パラメータを追加して返す）
    public override getFieldStr(): string {
        // valueをbase64にエンコード
        const value_converted = this.encodeMultibyte64(this.value);
        // 正規表現
        const regex = new RegExp(`.{1,76}`, 'g');
        // valueを76文字ずつ改行で分割
        const value_sliced76 = value_converted.match(regex)?.join('\n') || value_converted;
        // ヘッダーフィールドの作成
        let str = `${this.name}: ${value_sliced76}`;
        // ヘッダーフィールドにパラメータを追加
        Object.entries(this.parameter).forEach(([p_name, p_value]) => {
            str += ";";
            const add_str = `${p_name}="${p_value.getFieldValue().value}"`
            //
            if (str.length + add_str.length > 76) {
                str += `\n\t${add_str}`
            } else {
                str += add_str
            }
        });
        return str;
    }
}

// MIMEヘッダーフィールドのContent-Type
export type ContentType = {
    boundary?: Field,
    charset?: Field<Charset>,
    protocol?:Field<SMIMEContentType>,
    micalg?:Field<HashAlgorithmFormat<"LC_Hyphen">>,
    name?:Field,
    smime_type?:Field<SMIMEType>
};

// 添付ファイルのContent-Disposition情報
export type ContentDisposition = {
    filename: Field,
    size: Field,
};
