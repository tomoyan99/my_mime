import {Buffer} from "node:buffer";
import {mime} from "https://deno.land/x/mimetypes@v1.0.0/mod.ts";
import {basename} from "https://deno.land/std@0.224.0/path/mod.ts";
import { MIMEHeader } from "./MIMEHeader.ts";
import { MIMEBody } from "./MIMEBody.ts";
import { MIMEAttach } from "./MIMEAttach.ts";
import {Field} from "./MIMEBase.ts";

// メール情報
export type MailInfo = {
    from: string,
    to: string,
    subject?: string,
    message?: string
}

// メールのヘッダ、ボディ、添付ファイルを管理するクラス
export class MIME {
    public header: MIMEHeader;
    public body: MIMEBody;

    // コンストラクタ
    constructor(mail_info:MailInfo) {
        this.header = new MIMEHeader(mail_info); // ヘッダの初期化
        this.body =  new MIMEBody(mail_info.message); // ボディの初期化
    }
    // 添付ファイルを追加
    public async attachContent(path: string) {
        try {
            const stats = await Deno.stat(path); // ファイルの情報を取得
            const mime_type = mime.getType(path) || "application/octet-stream"; // MIMEタイプを取得
            const filename = basename(path); // ファイル名を取得
            const content = await Deno.readTextFile(path); // ファイル内容を読み込む

            const attachment = new MIMEAttach(mime_type,filename,`${stats.size}`,content);

            this.body.attachments.push(attachment); // 添付ファイルをリストに追加
        } catch (error) {
            const filename = basename(path); // ファイル名を取得
            if (error instanceof Deno.errors.NotFound) {
                console.log(`ファイル名:${filename}は存在しません`);
            } else {
                console.error("他のエラー:", error);
            }
        }
    }

    // 完成したメールのソースを取得
    public getMailSource() {
        // 汎用的なフィールド文字列生成関数
        function generateFieldStrArray(data:Record<string, any>): string[] {
            const result: string[] = [];
            for (const [_, fieldValue] of Object.entries(data)) {
                result.push(fieldValue.getFieldStr());
            }
            return result;
        }

        // Boundaryを取得
        const boundary = "--" + this.header.content_type.parameter.boundary.getFieldValue().value;

        // ヘッダー部分の生成
        const headStr = generateFieldStrArray(this.header).join("\n");
        // bodyからattachmentsを分離
        const {attachments,...body} = this.body;
        // ボディ部分の生成
        const bodyStr = generateFieldStrArray(body).join("\n");

        // 添付ファイル部分の生成
        const attachStr = attachments
            .map((attachment) => generateFieldStrArray(attachment).join("\n"))
            .join(`\n${boundary}\n`);

        // メールソースの結合
        let mailSource = `${headStr}\n${boundary}\n${bodyStr}`;
        if (attachStr.length > 0) {
            mailSource += `\n${boundary}\n${attachStr}`;
        }

        return mailSource;
    }

}