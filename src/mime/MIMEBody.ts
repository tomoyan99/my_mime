import {MIMEBase} from "./MIMEBase.ts";
import {Charset} from "../types/Charset.ts";
import {MIMETypeBody} from "../types/MimeType.d.ts";
import {Field, MultiField} from "./MIMEInfo.ts";

// ボディのContent-Type構造
type ContentTypeBody = {
    charset: Field<Charset>,
};

export interface IMIMEBodyProps {
    content_type: MultiField<ContentTypeBody,MIMETypeBody>;
    content_transfer_encoding: Field;
    message: Field;
}

export class MIMEBody extends MIMEBase<IMIMEBodyProps> implements IMIMEBodyProps {
    public content_type: MultiField<ContentTypeBody,MIMETypeBody>;
    public content_transfer_encoding: Field;
    public message: Field;
    constructor(message:string="") {
        super();
        this.content_type = new MultiField(
            "Content-Type",
            "text/plain",
            {
                charset: new Field("charset", "utf-8")
            }
        );
        this.content_transfer_encoding = new Field(
            "Content-Transfer-Encoding",
            "base64"
        );
        this.message = new Field(
            "Message",
            message
        );
    }
}
