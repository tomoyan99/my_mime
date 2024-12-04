import {Field, MultiField, TsHeaderFieldName} from "./MIMEBase.ts";
import {IMIMEAttachProps, MIMEAttach} from "./MIMEAttach.ts";
import {Charset} from "../../types/Charset.ts";
import {IMIMEBase} from "./MIMEBase.ts";

// ボディのContent-Type構造
type ContentTypeBody = {
    charset: Field<Charset>,
};

export  interface IMIMEBodyProps {
    content_type: MultiField<ContentTypeBody>;
    content_transfer_encoding: Field;
    message: Field;
    attachments:MIMEAttach[];
}

export class MIMEBody implements IMIMEBodyProps ,IMIMEBase{
    public content_type: MultiField<ContentTypeBody>;
    public content_transfer_encoding: Field;
    public message: Field;
    public attachments:MIMEAttach[];
    constructor(message:string="") {
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
        this.attachments = [];
    }
    public setProperties(props:IMIMEBodyProps) {
        Object.entries(props).forEach(([key, value]:[TsHeaderFieldName,any]) => {
            if (key in this){
                this[key] = value;
            }
        })
    }
    public addMIMEAttach(attach:MIMEAttach){
        this.attachments.push(attach)
    }
}
