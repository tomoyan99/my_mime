import {Buffer} from "node:buffer";
import { v4 as uuidv4 } from "npm:uuid";
import dayjs from "npm:dayjs";
import utc from "npm:dayjs/plugin/utc.js";
import customParseFormat from "npm:dayjs/plugin/customParseFormat.js";
import timezone from "npm:dayjs/plugin/timezone.js"
import { mime } from "https://deno.land/x/mimetypes@v1.0.0/mod.ts";
import { basename } from "https://deno.land/std@0.224.0/path/mod.ts";
import {Charset} from "../../types/Charset.ts";

// dayjsにtimezone, utc, customParseFormatプラグインを拡張
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// Fieldクラス: メールヘッダーやボディのフィールドを保持する汎用クラス
class Field<T extends string = string>{
    protected name: string; // フィールド名
    protected value:T; // フィールド値

    // コンストラクタ
    constructor(name: string, value: T) {
        this.name = name;
        this.value = value;
    }

    // フィールド値を設定
    public setFieldValue(name: string, value: T): void{
        this.name = name;
        this.value = value;
    }

    // フィールド値をオブジェクトとして返す
    public getFieldValue(){
        return {name:this.name, value:this.value};
    }

    // フィールドを文字列として取得（base64エンコーディング対応）
    public getFieldStr(){
        const flag = this.name.length === 0;
        const value_converted = this.convMultibyte(this.value,flag);
        const regex = new RegExp(`.{1,76}`, 'g'); // 76文字ごとに分割
        const value_sliced76 = value_converted.match(regex)?.join('\n') || value_converted;

        let str = "";
        if (this.name.length !== 0) {
            str = `${this.name}: ${value_sliced76}`;
        } else if (this.name.length === 0){
            str = `\n${value_sliced76}\n`;
        }
        return str;
    }

    // マルチバイト文字をbase64エンコードする
    protected convMultibyte(str: string,flag:boolean=false): string {
        const is_multibyte = str.length !== Buffer.byteLength(str, "utf-8");
        if (is_multibyte || flag) {
            return Buffer.from(str, "utf-8").toString("base64");
        } else {
            return str;
        }
    }
};

// MultiFieldクラス: 複数のフィールドを持つフィールドを定義
class MultiField<T extends Record<string, Field>, U extends string = string> extends Field<U> {
    parameter: T; // 追加のパラメータ

    constructor(name: string, value: U, param: T) {
        super(name, value);
        this.parameter = param;
    }

    // フィールドを文字列として取得（パラメータを追加して返す）
    public override getFieldStr(): string {
        const value_converted = this.convMultibyte(this.value);
        const regex = new RegExp(`.{1,76}`, 'g');
        const value_sliced76 = value_converted.match(regex)?.join('\n') || value_converted;

        let str = `${this.name}: ${value_sliced76};`;

        // パラメータを追加
        Object.entries(this.parameter).forEach(([p_name, p_value]) => {
            const add_str = ` ${p_name}="${p_value.getFieldValue().value}";`
            if (str.length + add_str.length > 76) {
                str += `\n${add_str}`
            } else {
                str += add_str
            }
        });
        return str;
    }
}

// ヘッダ情報（Content-Type）の構造
type ContentTypeHead = {
    boundary: Field
};

// MIMEヘッダの構造
type MimeHeadProps = {
    message_id: Field,
    from: Field,
    to: Field,
    subject: Field,
    date: Field,
    mime_version: Field,
    content_type: MultiField<ContentTypeHead>,
};


// ボディのContent-Type構造
type ContentTypeBody = {
    charset: Field<Charset>,
};

// MIMEボディの構造
type MimeBodyProps = {
    content_type: MultiField<ContentTypeBody>,
    content_transfer_encoding: Field,
    message: Field
};

// 添付ファイルのContent-Disposition情報
type ContentDisposition = {
    filename: Field,
    size?: Field,
};

// MIME添付ファイルの構造
type MimeAttachProps = {
    content_type: Field,
    content_transfer_encoding: Field,
    content_disposition: MultiField<ContentDisposition, "attachment" | "inline">,
    message: Field
};

// メール情報
export type MailInfo = {
    from: string,
    to: string,
    subject?: string,
    message?: string
}

// メールのヘッダ、ボディ、添付ファイルを管理するクラス
export class Mime {
    private header: MimeHeadProps;
    private body: MimeBodyProps;
    private attachment: MimeAttachProps[];

    // コンストラクタ
    constructor(mail_info: MailInfo) {
        this.header = this.initializeHeader(mail_info); // ヘッダの初期化
        this.body = this.initializeBody(mail_info.message); // ボディの初期化
        this.attachment = []; // 添付ファイルの初期化
    }

    // ヘッダ情報の初期化
    private initializeHeader(mail_info: MailInfo) {
        const header_temp: MimeHeadProps = {
            message_id: new Field("Message-ID", this.createMessageID()), // メッセージIDの生成
            from: new Field("From", mail_info.from),
            to: new Field("To", mail_info.to),
            date: new Field("Date", this.createTimeStamp()), // 日付の生成
            mime_version: new Field("MIME_Version", "1.0"),
            content_type: new MultiField("Content-Type", "multipart/mixed", { boundary: new Field("boundary", this.createBoundary()) }),
            subject: mail_info.subject ? new Field("Subject", mail_info.subject) : new Field("Subject", "")
        };
        return header_temp;
    }

    // ボディ情報の初期化
    private initializeBody(message: string = "") {
        const body_temp: MimeBodyProps = {
            content_type: new MultiField("Content-Type", "text/plain", { charset: new Field("charset", "utf-8") }),
            content_transfer_encoding: new Field("Content-Transfer-Encoding", "base64"),
            message: new Field("", message)
        };
        return body_temp;
    }

    // 添付ファイルを追加
    public async attachContent(path: string) {
        try {
            const stats = await Deno.stat(path); // ファイルの情報を取得
            const mime_type = mime.getType(path) || "application/octet-stream"; // MIMEタイプを取得
            const filename = basename(path); // ファイル名を取得
            const content = await Deno.readTextFile(path); // ファイル内容を読み込む
            const attach_temp: MimeAttachProps = {
                content_type: new Field("Content-Type", mime_type),
                content_disposition: new MultiField("Content-Disposition", "attachment", { filename: new Field("filename", filename), size: new Field("size", `${stats.size}`) }),
                content_transfer_encoding: new Field("Content_Transfer_Encoding", "base64"),
                message: new Field("", content)
            };

            this.attachment.push(attach_temp); // 添付ファイルをリストに追加
        } catch (error) {
            const filename = basename(path); // ファイル名を取得
            if (error instanceof Deno.errors.NotFound) {
                console.log(`ファイル名:${filename}は存在しません`);
            } else {
                console.error("他のエラー:", error);
            }
        }
    }

    // ヘッダ、ボディ、添付ファイルを取得
    public getArgments() {
        return { header: this.header, body: this.body, attachment: this.attachment };
    }

    // メッセージIDを生成
    private createMessageID(): string {
        const uuid1 = uuidv4();
        const uuid2 = uuidv4();
        const uuid1_no_bar = uuid1.split("-").join("").toUpperCase();
        const uuid2_no_bar = uuid2.split("-").join("").toUpperCase();
        const message_id = `<${uuid1_no_bar}@${uuid2_no_bar.substring(0, 31)}.SMAIL.COM>`;
        return message_id;
    }

    // 日付を生成
    private createTimeStamp(): string {
        const format = "ddd, DD MMM YYYY HH:mm:ss Z";
        const formattedDate = dayjs().utc().format(format);
        return formattedDate;
    }

    // バウンダリを生成
    private createBoundary() {
        const message_id = this.header?.message_id.getFieldValue().value;
        let boundary = "";
        if (message_id) {
            const uuid = message_id.split("@")[0];
            boundary = `========${uuid}========`;
        } else {
            const uuid = uuidv4();
            const uuid_no_bar = uuid.split("-").join("").toUpperCase();
            boundary = `========${uuid_no_bar}========`;
        }
        return boundary;
    }

    // 完成したメールのソースを取得
    public getMailSource() {
        const boundary = "--" + this.header.content_type.parameter.boundary.getFieldValue().value;
        const head_arr = Object.entries(this.header).map(([f_name, f_value]) => f_value.getFieldStr()).join("\n");
        const body_arr = Object.entries(this.body).map(([f_name, f_value]) => f_value.getFieldStr()).join("\n");
        const attach_arr = this.attachment.map((attachment) => Object.entries(attachment).map(([f_name, f_value]) => f_value.getFieldStr()).join("\n")).join(`\n${boundary}\n`);
        return `${head_arr}\n${boundary}\n${body_arr}\n${boundary}\n${attach_arr}`;
    }
}

