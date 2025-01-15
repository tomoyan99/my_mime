import {mime} from "https://deno.land/x/mimetypes@v1.0.0/mod.ts";
import {basename} from "https://deno.land/std@0.224.0/path/mod.ts";
import {MIMEHeader} from "./MIMEHeader.ts";
import {MIMEBody} from "./MIMEBody.ts";
import {MIMEAttach} from "./MIMEAttach.ts";
import {MIMEProps} from "./MIMEBase.ts";
import {MIMETypeBody} from "../types/MimeType.d.ts";
import * as path from "node:path";

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
    public attachments: MIMEAttach[];

    // コンストラクタ
    constructor(mail_info:MailInfo) {
        this.header = new MIMEHeader(mail_info); // ヘッダの初期化
        this.body =  new MIMEBody(mail_info.message); // ボディの初期化
        this.attachments = [];
    }
    // 添付ファイルを追加
    public async attachContent(path: string):Promise<void>;//ファイルパスを指定したとき
    public async attachContent(attachment: MIMEAttach):Promise<void>;//MIMEアタッチを指定したとき
    public async attachContent(arg:string|MIMEAttach){
        if (typeof arg === "string"){
            const path = arg;
            try {
                const stats = await Deno.stat(path); // ファイルの情報を取得
                const mimeType = <MIMETypeBody>mime.getType(path) || "application/octet-stream"; // MIMEタイプを取得
                const filename = basename(path); // ファイル名を取得
                const content = await Deno.readTextFile(path); // ファイル内容を読み込む

                const attachment = new MIMEAttach(mimeType,filename,`${stats.size}`,content);
                this.attachments.push(attachment); // 添付ファイルをリストに追加
            } catch (error) {
                const filename = basename(path); // ファイル名を取得
                if (error instanceof Deno.errors.NotFound) {
                    console.log(`ファイル名:${filename}は存在しません`);
                } else {
                    console.error("他のエラー:", error);
                }
            }
        }else{
            this.attachments.push(arg);
        }
    }

    // 添付ファイルを削除
    public removeContent(index:number){
        if (index === -1) index = this.attachments.length-1;
        const attachment:MIMEAttach = this.attachments[index];
        this.attachments.splice(index,1);
        return attachment;
    }

    // 完成したメールのソースを取得
    public getMailSource() {
        // Boundaryを取得
        const boundary = "--" + this.header.content_type.parameter.boundary?.getFieldValue().value;

        // ヘッダー部分の生成
        const headStr = this.generateFieldStrArray(this.header).join("\n");
        // ボディ部分の生成
        const bodyStr = this.generateFieldStrArray(this.body).join("\n");
        // 添付ファイル部分の生成
        const attachStr = this.attachments
            .map((attachment) => this.generateFieldStrArray(attachment).join("\n"))
            .join(`\n${boundary}\n`);
        // メールソースの結合
        let mailSource = `${headStr}\n${boundary}\n${bodyStr}`;
        if (attachStr.length > 0) {
            mailSource += `\n${boundary}\n${attachStr}`;
        }
        mailSource = mailSource.replace(/(?<!\r)\n/g, '\r\n');
        return mailSource;
    }
    public getMailSourceJSON(){
        const mailSource = {
            header: this.header,
            body: this.body,
            attachments: this.attachments
        }
        return JSON.stringify(mailSource, null, 2);
    }

    // 汎用的なフィールド文字列生成関数
    protected generateFieldStrArray(data:MIMEProps): string[] {
        const result: string[] = [];
        for (const [_, fieldValue] of Object.entries(data)) {
            if ("getFieldStr" in fieldValue) {
                result.push(fieldValue.getFieldStr());
            }
        }
        return result;
    }
    public async saveSourceString(filePath:string){
        const str = this.getMailSource();
        await Deno.mkdir(path.dirname(filePath),{recursive:true});
        await Deno.writeTextFile(filePath,str);
    }
    public async saveSourceJSON(filePath:string){
        const json = this.getMailSourceJSON();
        await Deno.mkdir(path.dirname(filePath),{recursive:true});
        await Deno.writeTextFile(filePath,json);
    }
}