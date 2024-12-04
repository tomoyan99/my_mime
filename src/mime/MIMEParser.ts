import {MailInfo, MIME} from "./MIME.ts";
import {mimeHeaderToProp} from "./fieldName.ts";
import {Field, HeaderFieldName, MultiField, TsHeaderFieldName} from "./MIMEBase.ts"
import {IMIMEHeaderProps} from "./MIMEHeader.ts";
import {IMIMEBodyProps} from "./MIMEBody.ts";
import {IMIMEAttachProps, MIMEAttach} from "./MIMEAttach.ts";
import { basename } from "node:path";
import { Buffer } from "node:buffer";

type MIMEProps = IMIMEHeaderProps|IMIMEBodyProps|IMIMEAttachProps;
type SegRecordArr = { name: HeaderFieldName; value: string; params:{ name: HeaderFieldName; value: string }[] };


// boundaryを検索し取得する関数
function getBoundary(input: string): string | null {
    const match = input.match(/boundary="([^"]+)"/);
    return match ? match[1] : null;
}

function transformToObject(seg_record_arr: SegRecordArr[]){
    const result:Record<string, any> = {};

    for (const seg_record of seg_record_arr) {
        const { name, value, params } = seg_record;

        // ヘッダフィールド名をキー名に変換（例: "Content-Type" → "content_type"）
        const key:TsHeaderFieldName = mimeHeaderToProp[name];

        if (params.length > 0) {
            // `params` が存在する場合は `MultiField` を作成
            const paramObject: Record<string, Field> = {};
            for (const param of params) {
                paramObject[param.name] = new Field(param.name, param.value);
            }
            result[key] = new MultiField(name, value, paramObject);
        } else {
            // `params` が存在しない場合は `Field` を作成
            result[key] = new Field(name, value);
        }
    }
    return result;
}

//セグメントをMIMEPropsにパースする関数
function parseSegment<T extends MIMEProps>(segment:string[]){
    let message_base64 = "";
    // セグメントを{name,value,props}[]のobjectにparse
    const seg_record = segment.map((record:string)=>{
        // フィールド名とフィールド・プロパティ値に分割
        const [f_name,fp_value]=record.split(": ");
        if (fp_value) {
            const [f_value,...params] = fp_value.split(";");
            const pppp = params.map((param:string)=>{
                const [p_name,p_value] = param.split(/=(.+)/).filter(Boolean);
                return {name:p_name,value:p_value.replaceAll("\"","")};
            });
            return {name:f_name,value:f_value,params:pppp};
        }else{
            message_base64 += f_name;
            return {name:"",value:"",params:[]};
        }
    }).filter((obj)=>obj.name.length > 0);
    const message_utf8 = Buffer.from(message_base64,"base64").toString("utf8");
    seg_record.push({name:"Message",value:message_utf8,params:[]});
    return <T>transformToObject(seg_record);
}

export class MIMEParser {
    public static parseByStr(mime_entity:string){
        // mimeエンティティを整形
        mime_entity = mime_entity.replaceAll(/\n\t/g,"");
        // boundaryを取得
        const boundary = getBoundary(mime_entity);
        // boundaryによってセグメントに分ける
        const segments = mime_entity.split(`--${boundary}`).map((seg:string)=>seg.split("\n").filter(Boolean));
        // headセグメント、bodyセグメント、attachmentsセグメントに分割
        const [seg_head,seg_body,...seg_attachments]=[...segments];
        const header_param = parseSegment<IMIMEHeaderProps>(seg_head);
        const body_param = parseSegment<IMIMEBodyProps>(seg_body);
        const attach_params = seg_attachments.map((seg_attachment)=>parseSegment<IMIMEAttachProps>(seg_attachment));
        const mail_info:MailInfo = {
            from:header_param.from.getFieldValue().value,
            to:header_param.to.getFieldValue().value,
            subject:header_param.subject.getFieldValue().value,
            message:body_param.message?.getFieldValue().value??""
        }

        const m = new MIME(mail_info);

        m.header.setProperties(header_param);
        m.body.setProperties(body_param);
        for (const attach_param of attach_params) {
            const param = {
                mime_type:attach_param.content_type.getFieldValue().value,
                filename:attach_param.content_disposition.parameter.filename.getFieldValue().value,
                size:attach_param.content_disposition.parameter.size.getFieldValue().value,
                content:attach_param.message.getFieldValue().value,
            }
            const attach = new MIMEAttach(param.mime_type,param.filename,param.size,param.content)
            m.body.addMIMEAttach(attach);
        }
        return m;
    }

    public static async parseByFile(path:string):Promise<MIME>{
        try {
            const content = await Deno.readTextFile(path); // ファイル内容を読み込む
            return MIMEParser.parseByStr(content);
        } catch (error) {
            throw error;
        }
    }
}