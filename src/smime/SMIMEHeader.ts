import {MailInfo} from "../mime/MIME.ts";
import {MIMEHeader} from "../mime/MIMEHeader.ts";
import {ContentType, Field, MultiField} from "../mime/MIMEInfo.ts";
import {SMIMEContentType, SMIMEType} from "../types/MimeType.d.ts";
import {HashAlgorithmFormat} from "./Micalg.ts";

export class SMIMEHeader extends MIMEHeader {
    constructor(mailInfo: MailInfo) {
        super(mailInfo);
    }
    public convSignature(protocol:SMIMEContentType,micalg:HashAlgorithmFormat<"LC_Hyphen">) {
        if (this.content_type.parameter.boundary) {

            this.content_type = new MultiField("Content-Type","multipart/signed",{
                boundary:this.content_type.parameter.boundary,
                protocol:new Field("protocol",protocol),
                micalg:new Field("micalg",micalg),
            });
        }
    }
    public convEncryption(smime_type:SMIMEType) {
        if (this.content_type.parameter.boundary
            && this.content_type.parameter.charset
            && this.content_type.parameter.name) {

            this.content_type = new MultiField("Content-Type","application/pkcs7-mime",{
                boundary:this.content_type.parameter.boundary,
                charset:this.content_type.parameter.charset,
                smime_type:new Field("smime_type",smime_type),
                name:this.content_type.parameter.name,
            });
        }
    }
}
