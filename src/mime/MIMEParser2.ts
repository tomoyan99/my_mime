import { MailInfo, MIME } from "./MIME.ts";
import { mimeHeaderToProp } from "./fieldName.ts";
import { Field, HeaderFieldName, MultiField, TsHeaderFieldName } from "./MIMEBase.ts";
import { IMIMEHeaderProps } from "./MIMEHeader.ts";
import { IMIMEBodyProps } from "./MIMEBody.ts";
import { IMIMEAttachProps, MIMEAttach } from "./MIMEAttach.ts";
import { basename } from "node:path";
import { Buffer } from "node:buffer";

type MIMEProps = IMIMEHeaderProps|IMIMEBodyProps|IMIMEAttachProps;
type SegRecordArr = { name: HeaderFieldName; value: string; params:{ name: HeaderFieldName; value: string }[] };

// boundaryを検索して取得
function extractBoundary(input: string): string | null {
    const match = input.match(/boundary="([^"]+)"/);
    return match ? match[1] : null;
}

// セグメントをMIMEオブジェクトに変換する共通処理
function parseParamsToObject(params: { name: HeaderFieldName; value: string }[]): Record<string, Field> {
    const paramObject: Record<string, Field> = {};
    for (const param of params) {
        paramObject[param.name] = new Field(param.name, param.value);
    }
    return paramObject;
}

// セグメントをオブジェクトに変換
function transformToObject(segRecordArr: SegRecordArr[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const { name, value, params } of segRecordArr) {
        const key: TsHeaderFieldName = mimeHeaderToProp[name];

        if (params.length > 0) {
            const paramObject = parseParamsToObject(params);
            result[key] = new MultiField(name, value, paramObject);
        } else {
            result[key] = new Field(name, value);
        }
    }
    return result;
}

// セグメントをパースしてオブジェクトを生成
function parseSegment<T extends MIMEProps>(segment: string[]): T {
    let messageBase64 = "";

    const segRecord = segment.map((record: string) => {
        const [fName, fpValue] = record.split(": ");

        if (fpValue) {
            const [fValue, ...params] = fpValue.split(";");
            const paramArray = parseParamsToObject(
                params.map((param: string) => {
                    const [pName, pValue] = param.split(/=(.+)/).filter(Boolean);
                    return { name: pName, value: pValue.replaceAll("\"", "") };
                })
            );
            return { name: fName, value: fValue, params: paramArray };
        } else {
            messageBase64 += fName; // base64メッセージ部分の処理
            return { name: "", value: "", params:  };
        }
    }).filter((obj) => obj.name.length > 0);

    const messageUtf8 = Buffer.from(messageBase64, "base64").toString("utf8");
    segRecord.push({ name: "", value: messageUtf8, params: [] });

    return transformToObject(segRecord) as T;
}

export class MIMEParser {
    // MIME文字列を解析
    public static parseByStr(mimeEntity: string): MIME {
        mimeEntity = mimeEntity.replaceAll(/\n\t/g, ""); // 整形

        const boundary = extractBoundary(mimeEntity); // boundaryを取得
        const segments = mimeEntity.split(`--${boundary}`).map((seg: string) => seg.split("\n").filter(Boolean));

        const [segHead, segBody, ...segAttachments] = segments;

        const headerParam = parseSegment<IMIMEHeaderProps>(segHead);
        const bodyParam = parseSegment<IMIMEBodyProps>(segBody);
        const attachParams = segAttachments.map((segAttachment) => parseSegment<IMIMEAttachProps>(segAttachment));

        const mailInfo: MailInfo = {
            from: headerParam.from.getFieldValue().value,
            to: headerParam.to.getFieldValue().value,
            subject: headerParam.subject.getFieldValue().value,
            message: bodyParam.message?.getFieldValue().value ?? ""
        };

        const mime = new MIME(mailInfo);
        mime.header.setProperties(headerParam);
        mime.body.setProperties(bodyParam);

        // 添付ファイルの処理
        for (const attachParam of attachParams) {
            const param = {
                mimeType: attachParam.content_type.getFieldValue().value,
                filename: attachParam.content_disposition.parameter.filename.getFieldValue().value,
                size: attachParam.content_disposition.parameter.size.getFieldValue().value,
                content: attachParam.message.getFieldValue().value
            };
            const attach = new MIMEAttach(param.mimeType, param.filename, param.size, param.content);
            mime.body.addMIMEAttach(attach);
        }

        return mime;
    }

    // ファイルパスからMIMEを解析
    public static async parseByFile(path: string): Promise<MIME> {
        try {
            const content = await Deno.readTextFile(path); // ファイル内容を読み込む
            return MIMEParser.parseByStr(content);
        } catch (error) {
            throw error;
        }
    }
}
