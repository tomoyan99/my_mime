import { Buffer } from "node:buffer";
import {MailInfo, MIME} from "../mime/MIME.ts";
import {SMIMEHeader} from "./SMIMEHeader.ts";
import {MIMEAttach} from "../mime/MIMEAttach.ts";
import {HashAlgorithm, SMIMEContentType, UHashAlgorithm} from "../../types/MimeType.d.ts";
import { Key } from "./Key.ts";
import { uint8ArrayToBase64 } from "../../utils/uint8Base64.ts";

export type SMailInfo = {
    certificatePath : string; // 証明書のパス
    mailInfo : MailInfo&{attachPaths:string[]},
    protocol:SMIMEContentType,
    micalg:HashAlgorithm
}

export class SMIME extends MIME{
    public override header:SMIMEHeader;
    private signature:Uint8Array;
    private signatureStr:string;

    constructor(params:SMailInfo) {
        super(params.mailInfo);
        this.header = new SMIMEHeader(params.mailInfo);
        this.signature = new Uint8Array();
        this.signatureStr = "";
    }
    public static async init(params:SMailInfo){
        const instance = new SMIME(params);
        for (const attachPath of params.mailInfo.attachPaths) {
            await instance.attachContent(attachPath);
        }
        return instance;
    }
    public async sign(myPriKeyPath:string,protocol:SMIMEContentType,micalg:HashAlgorithm){
        // ヘッダーを署名用に変換
        this.header.convSignature(protocol,micalg);

        const bodySource = this.getMailSourceBody();
        const myPriKey = await Key.register(myPriKeyPath,"private");

        const signature = await this.createSignature(bodySource,myPriKey);
        const signatureStr = uint8ArrayToBase64(signature);
        const signatureSize = new TextEncoder().encode(signatureStr).length;

        this.signature = signature;
        this.signatureStr = signatureStr;

        await this.attachContent(new MIMEAttach(protocol,"smime.p7s",`${signatureSize}`,signatureStr));
    }
    public async verify(youPubKeyPath:string){
        // 公開鍵を取得
        const youPubKey = await Key.register(youPubKeyPath,"public");
        // 一回署名を取り除いて
        const attachment = this.removeContent(-1);
        // bodyを取得して
        const bodySource = this.getMailSourceBody();
        // 署名の検証
        const isValid = await this.verifySignature(bodySource,this.signature,youPubKey);
        // 署名を戻す
        await this.attachContent(attachment);
        return isValid;
    }
    public async encrypt(recvPubKey:Uint8Array){
        // ヘッダーを暗号化用に変換
        this.header.convEncryption("enveloped-data");
        const bodySource = this.getMailSourceBody();
    }
    private createEncryption(fileContent: string, privateKey:Uint8Array) {
        // メッセージをバイト列に変換
        const encoder = new TextEncoder();
        const data = encoder.encode(fileContent);
    }

    private getMailSourceBody(): string {
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
        let mailSource = `${bodyStr}`;
        if (attachStr.length > 0) {
            mailSource += `\n${boundary}\n${attachStr}`;
        }
        return mailSource;
    }
    // 署名の生成
    private async createSignature(fileContent: string, privateKey:Key){
        // ファイルの内容をハッシュ化（SHA-256）
        const encoder = new TextEncoder();
        const fileData = encoder.encode(fileContent);
        const algorithm = <UHashAlgorithm>this.header.content_type.parameter.micalg?.getFieldValue().value.toUpperCase()??"SHA-256";
        const hashBuffer = await crypto.subtle.digest(algorithm, fileData);

        // 秘密鍵をCryptoKey形式に変換
        const key = await privateKey.importKey(algorithm);
        // ハッシュ値を秘密鍵で署名
        const signature = await crypto.subtle.sign(
            {name: "RSASSA-PKCS1-v1_5"}, // 署名アルゴリズム
            key,
            hashBuffer // ハッシュ化されたデータ
        );
        // 署名をUint8Array形式で返す
        return new Uint8Array(signature);
    }
    private async verifySignature(
        fileContent: string,
        signature: Uint8Array,
        publicKey: Key
    ): Promise<boolean> {

        // ファイルの内容をハッシュ化（SHA-512）
        const encoder = new TextEncoder();
        const fileData = encoder.encode(fileContent);
        const algorithm = <UHashAlgorithm>this.header.content_type.parameter.micalg?.getFieldValue().value.toUpperCase()??"SHA-256";
        const hashBuffer = await crypto.subtle.digest(algorithm, fileData);

        // 公開鍵をインポート
        const key = await publicKey.importKey(algorithm);

        // 署名を検証
        const isValid = await crypto.subtle.verify(
            {name: "RSASSA-PKCS1-v1_5"}, // 署名アルゴリズム
            key, // 公開鍵
            signature.buffer, // 検証対象の署名
            hashBuffer // ハッシュ化されたデータ
        );
        return isValid;
    }
}