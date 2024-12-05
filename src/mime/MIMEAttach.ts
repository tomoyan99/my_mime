import {ContentType, Field, MIMEBase, MultiField} from "./MIMEBase.ts";
import {MIMETypeBody} from "../../types/MimeType.d.ts";

// 添付ファイルのContent-Disposition情報
type ContentDisposition = {
    filename: Field,
    size: Field,
};

export interface IMIMEAttachProps {
    content_type: MultiField<ContentType,MIMETypeBody>;
    content_transfer_encoding: Field;
    content_disposition: MultiField<ContentDisposition, "attachment" | "inline">;
    message: Field;
}

export class MIMEAttach extends MIMEBase<IMIMEAttachProps> implements IMIMEAttachProps {
    public content_type:MultiField<ContentType,MIMETypeBody>;
    public content_transfer_encoding;
    public content_disposition;
    public message;
    constructor(mime_type:MIMETypeBody,filename:string,size:string,content:string) {
        super();
        this.content_type = new MultiField(
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
}
