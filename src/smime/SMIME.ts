import {
    MIME,
    MailInfo,
    MimeHeadProps,
    MultiField,
    ContentTypeHead,
    Field,
    MimeBodyProps,
    ContentTypeBody, MimeAttachProps, MimeTypeHead
} from "../mime/MIME.ts";
type SMimeParams = {
    certificatePath : string; // 証明書のパス
    mail_info : MailInfo,
}
type SmimeTypeHead = "multipart/signed" |"multipart/encrypted";
type SmimeTypeSign = "application/pkcs7-signature" | "application/pkcs7-mime"|"application/cms";
type HashAlgorithm = "sha1" | "sha224" | "sha256" | "sha384" | "sha512" | "md5";
type SmimeContentTypeHead=ContentTypeHead&{
    protocol:Field<SmimeTypeSign>,
    micalg:Field<HashAlgorithm>,
}

type SmimeHeadProps = MimeHeadProps&{
    content_type:MultiField<SmimeContentTypeHead,SmimeTypeHead&MimeTypeHead>
};
type SmimeBodyProps = MimeBodyProps;
type SmimeAttachProps = MimeAttachProps&{
    content_type: Field<SmimeTypeSign>,
};

type SmimeSignProps = MimeBodyProps&{
    content_type:MultiField<ContentTypeBody,SmimeTypeSign>
};

class SMIME extends MIME{
    protected override readonly header: SmimeHeadProps;
    protected override readonly body: SmimeBodyProps;
    protected override readonly attachment:SmimeAttachProps[];
    private readonly signature:SmimeSignProps;

    constructor(params:SMimeParams) {
        super(params.mail_info);
        const {header,body,attachment} = this.getArguments();
        this.header = <SmimeHeadProps>header;
        this.body = <SmimeBodyProps>body;
        this.attachment = <SmimeAttachProps[]>attachment;

        this.header.content_type.parameter.protocol.setFieldValue("protocol","application/cms");
        this.header.content_type.parameter.micalg.setFieldValue("micalg","sha512");

    }
}