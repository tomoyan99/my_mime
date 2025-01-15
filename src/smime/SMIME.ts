import {MailInfo, MIME} from "../mime/MIME.ts";
import {SMIMEHeader} from "./SMIMEHeader.ts";
import {MIMEAttach} from "../mime/MIMEAttach.ts";
import {SMIMEContentType,} from "../types/MimeType.d.ts";
import {HashAlgorithmFormat} from "./Micalg.ts";
import {signMessage, verifyMessage} from "./signVeri.ts";

export type SMailInfo = {
    mailInfo : MailInfo&{attachPaths?:string[]},
    protocol:SMIMEContentType,
    micalg:HashAlgorithmFormat<"LC_Hyphen">
}

export class SMIME extends MIME{
    public override header:SMIMEHeader;
    private signature:string;

    private constructor(params:SMailInfo) {
        super(params.mailInfo);
        this.header = new SMIMEHeader(params.mailInfo);
        this.signature = "";
    }
    public static async init(params:SMailInfo){
        const instance = new SMIME(params);
        if (params.mailInfo.attachPaths){
            for (const attachPath of params.mailInfo.attachPaths) {
                await instance.attachContent(attachPath);
            }
        }
        return instance;
    }
    public setSignature(signature:string){
        this.signature = signature;
    }
    public async sign(myPriKeyPath:string,protocol:SMIMEContentType,micalg:HashAlgorithmFormat<"LC_Hyphen">){
        // ヘッダーを署名用に変換
        this.header.convSignature(protocol,micalg);

        const source = this.getMailSource();

        const signature = await signMessage(source,myPriKeyPath);
        const signatureSize = new TextEncoder().encode(signature).length;

        this.signature = signature;

        await this.attachContent(new MIMEAttach(protocol,"smime.p7s",`${signatureSize}`,signature));
    }
    public async verify(youPubKeyPath:string,algorithm:HashAlgorithmFormat<"LC_Hyphen">="sha-256"){
        // 一回署名を取り除いて
        const attachment = this.removeContent(-1);
        // ソースを取得して
        const source = this.getMailSource();
        // 署名の検証
        const isValid = await verifyMessage(source,this.signature,youPubKeyPath,algorithm);
        // 署名を戻す
        await this.attachContent(attachment);
        return isValid;
    }

    public async encrypt(recvPubKey:Uint8Array){
        // ヘッダーを暗号化用に変換
        this.header.convEncryption("enveloped-data");
        const source = this.getMailSource();
    }
    private createEncryption(fileContent: string, privateKey:Uint8Array) {
        // メッセージをバイト列に変換
        const encoder = new TextEncoder();
        const data = encoder.encode(fileContent);
    }
}