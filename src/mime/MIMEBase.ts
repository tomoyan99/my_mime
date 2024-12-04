import { Buffer } from "node:buffer";

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
    | "size"
    | "charset"
    | "boundary"
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
    | "size"
    | "charset"
    | "boundary"
    | "message" // これは本文を示す独自のtype
    | string;

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
    public getFieldStr(){
        const flag = this.name === "Message"; // フィールド名が存在しない(=メッセージ)時はbase64エンコードする
        const value_converted = this.convMultibyte(this.value,flag);
        const regex = new RegExp(`.{1,76}`, 'g'); // 76文字ごとに分割
        const value_sliced76 = value_converted.match(regex)?.join('\n') || value_converted;

        let str = "";
        if (this.name === "Message") {
            str = `\n${value_sliced76}\n`;
        } else{
            str = `${this.name}: ${value_sliced76}`;
        }
        return str;
    }

    // マルチバイト文字をbase64エンコードする
    protected convMultibyte(str: string,flag:boolean=false): string {
        // マルチバイト文字が混じっているかの検出
        const is_multibyte = str.length !== Buffer.byteLength(str, "utf-8");
        if (is_multibyte || flag) {
            return Buffer.from(str, "utf-8").toString("base64");
        } else {
            return str;
        }
    }
}

// MultiFieldクラス: 複数のフィールドを持つフィールドを定義
export class MultiField<T extends Record<string, Field>, U extends string = string> extends Field<U> {
    parameter: T; // 追加のパラメータ

    constructor(name:HeaderFieldName, value: U, param: T) {
        super(name, value);
        this.parameter = param;
    }

    // フィールドを文字列として取得（パラメータを追加して返す）
    public override getFieldStr(): string {
        const value_converted = this.convMultibyte(this.value);
        const regex = new RegExp(`.{1,76}`, 'g');
        const value_sliced76 = value_converted.match(regex)?.join('\n') || value_converted;

        let str = `${this.name}: ${value_sliced76}`;

        // パラメータを追加
        Object.entries(this.parameter).forEach(([p_name, p_value]) => {
            str += ";";
            const add_str = `${p_name}="${p_value.getFieldValue().value}"`
            if (str.length + add_str.length > 76) {
                str += `\n\t${add_str}`
            } else {
                str += add_str
            }
        });
        return str;
    }
}



export interface IMIMEBase {
    // プロパティの設定
    setProperties:(props:any)=>void;
}

