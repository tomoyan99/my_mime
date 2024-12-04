import {HeaderFieldName, TsHeaderFieldName} from "./MIMEBase.ts";


// MIMEヘッダーフィールド名をTypeScript用のプロパティ名に変換するマッピングオブジェクト
export const mimeHeaderToProp: Readonly<Record<HeaderFieldName,TsHeaderFieldName>> = {
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
    "size": "size",
    "charset": "charset",
    "boundary": "boundary",
    "Message":"message"
};
