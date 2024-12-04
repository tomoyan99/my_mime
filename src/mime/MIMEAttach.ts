import {IMIMEBase,Field, MultiField} from "./MIMEBase.ts";

// 添付ファイルのContent-Disposition情報
type ContentDisposition = {
    filename: Field,
    size: Field,
};

export interface IMIMEAttachProps {
    content_type: Field;
    content_transfer_encoding: Field;
    content_disposition: MultiField<ContentDisposition, "attachment" | "inline">;
    message: Field;
}

export class MIMEAttach implements IMIMEAttachProps ,IMIMEBase{
    public content_type: Field;
    public content_transfer_encoding: Field;
    public content_disposition: MultiField<ContentDisposition, "attachment" | "inline">;
    public message: Field;
    constructor(mime_type:string,filename:string,size:string,content:string) {
        this.content_type = new Field(
            "Content-Type",
            mime_type
        );
        this.content_disposition = new MultiField(
            "Content-Disposition",
            "attachment",
            {
                filename: new Field(
                    "filename",
                    filename
                ),
                size: new Field(
                    "size",
                    size
                )
            }
        );
        this.content_transfer_encoding = new Field(
            "Content-Transfer-Encoding",
            "base64"
        );

        this.message = new Field(
            "Message",
            content
        );
    }
    public setProperties(props:IMIMEAttachProps) {
        Object.entries(props).forEach(([key, value]) => {
            if (key in this) {
                this[key] = value;
            }
        });
    }
}
