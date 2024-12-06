import {v4 as uuidv4} from "npm:uuid@11.0.3";
import dayjs from "npm:dayjs@1.11.13";
import utc from "npm:dayjs/plugin/utc.js";
import customParseFormat from "npm:dayjs/plugin/customParseFormat.js";
import timezone from "npm:dayjs/plugin/timezone.js"
import {MailInfo} from "./MIME.ts";
import {MIMEBase} from "./MIMEBase.ts";
import {MimeTypeHead} from "../types/MimeType.d.ts";
import {ContentType, Field, MultiField} from "./MIMEInfo.ts";

// dayjsにtimezone, utc, customParseFormatプラグインを拡張
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export interface IMIMEHeaderProps {
    message_id: Field;
    from: Field;
    to: Field;
    subject: Field;
    date: Field;
    mime_version: Field;
    content_type: MultiField<ContentType,MimeTypeHead>;
}

export class MIMEHeader extends MIMEBase<IMIMEHeaderProps> implements IMIMEHeaderProps {
    public message_id:Field;
    public from:Field;
    public to:Field;
    public subject:Field;
    public date:Field;
    public mime_version:Field;
    public content_type: MultiField<ContentType,MimeTypeHead>;

    constructor(mail_info: MailInfo) {
        super();
        this.message_id = new Field(
            "Message-ID",
            this.createMessageID() // メッセージIDの生成
        );
        this.from = new Field(
            "From",
            mail_info.from
        );
        this.to = new Field(
            "To",
            mail_info.to
        );
        this.date = new Field(
            "Date",
            this.createTimeStamp() // 日付の生成
        );
        this.mime_version = new Field(
            "MIME-Version",
            "1.0"
        );
        this.content_type = new MultiField(
            "Content-Type",
            "multipart/mixed",
            {boundary: new Field("boundary", this.createBoundary())}
        );
        this.subject = mail_info.subject
            ? new Field("Subject", mail_info.subject)
            : new Field("Subject", "");
    }
    // メッセージIDを生成
    private createMessageID(): string {
        const uuid1 = uuidv4();
        const uuid2 = uuidv4();
        const uuid1_no_bar = uuid1.split("-").join("").toUpperCase();
        const uuid2_no_bar = uuid2.split("-").join("").toUpperCase();
        return `<${uuid1_no_bar}@${uuid2_no_bar.substring(0, 31)}.SMAIL.COM>`;
    }
    // 日付を生成
    private createTimeStamp(): string {
        const format = "ddd, DD MMM YYYY HH:mm:ss Z";
        return dayjs().utc().format(format);
    }
    // バウンダリを生成
    private createBoundary() {
        const message_id = this.message_id.getFieldValue().value;
        let boundary;
        if (message_id) {
            const uuid = message_id.replace(/[<>]/g,"").split("@")[0];
            boundary = `========${uuid}========`;
        } else {
            const uuid = uuidv4();
            const uuid_no_bar = uuid.split("-").join("").toUpperCase();
            boundary = `========${uuid_no_bar}========`;
        }
        return boundary;
    }
}
