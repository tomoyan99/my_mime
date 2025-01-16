import {MailInfo, MIME} from "../mime/MIME.ts";
import {MIMEProps} from "../mime/MIMEBase.ts";
import {IMIMEHeaderProps} from "../mime/MIMEHeader.ts";
import {IMIMEBodyProps} from "../mime/MIMEBody.ts";
import {IMIMEAttachProps, MIMEAttach} from "../mime/MIMEAttach.ts";
import {Buffer} from "node:buffer";
import {Field, HeaderFieldName, mimeHeaderToProp, MultiField, TsHeaderFieldName} from "../mime/MIMEInfo.ts";
import {SMailInfo, SMIME} from "../smime/SMIME.ts";
import {decodeBase64} from "../utils/uint8Base64.ts";

type SegRecordArr = { name: HeaderFieldName; value: string; params: { name: HeaderFieldName; value: string }[] };

// boundaryを検索し取得する関数
function getBoundary(input: string): string | null {
    const match = input.match(/boundary="([^"]+)"/);
    return match ? match[1] : null;
}

// SegRecordArr配列をオブジェクトに変換する関数
function transformToObject(seg_record_arr: SegRecordArr[]): Record<string, any> {
    const result: Record<string, any> = {};

    // 各セグメントレコードを処理
    for (const seg_record of seg_record_arr) {
        const { name, value, params } = seg_record;

        // nameが""だったら以降の処理をスキップ
        if (name.length === 0)continue;

        // ヘッダフィールド名をキー名に変換（例: "Content-Type" → "content_type"）
        const key: TsHeaderFieldName = mimeHeaderToProp(name);

        if (params.length > 0) {
            // `params` が存在する場合は `MultiField` を作成
            const paramObject: Record<string, Field> = {};

            // 各パラメータを処理
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

// セグメントをMIMEPropsにパースする関数
function parseSegment<T extends MIMEProps>(segment: string[]): T {
    let messageBase64 = "";
    const segRecord: SegRecordArr[] = [];

    // セグメントを {name, value, params} の形式にパース
    segment.forEach((record: string) => {
        // フィールド名とフィールド・プロパティ値に分割
        const [fieldName, fieldValue] = record.split(": ");

        if (fieldValue) {
            // フィールド値がある場合、パラメータを分解
            let [fieldMainValue, ...params] = fieldValue.split(";");
            // フィールドメイン値がBase64エンコードのときはutf-8に
            fieldMainValue = decodeBase64(fieldMainValue);

            // `params` 配列の各要素（"name=value" 形式）を処理し、
            // `name` と `value` をオブジェクト形式に変換する
            const paramObjects = params.map((param: string) => {
                // `param` を "=" で分割し、最初の部分を `paramName`、残りを `paramValue` に格納
                // 正規表現 /(=.+)/ を使用して、"=" の後のすべての文字をキャプチャする
                let [paramName, paramValue] = param.split(/=(.+)/).filter(Boolean);

                // `paramValue` に含まれるダブルクオート (") をすべて削除
                // 例えば `"UTF-8"` → `UTF-8` に変換
                paramValue =  paramValue.replaceAll("\"", "");
                return {
                    name: paramName,
                    value: paramValue
                };
            });

            segRecord.push({ name: fieldName, value: fieldMainValue, params: paramObjects });
        } else {
            // フィールド値がない場合（例えばメッセージの本体）
            messageBase64 += fieldName;
            segRecord.push({ name: "", value: "", params: [] });
        }
    });

    // メッセージが存在したときの処理
    if (messageBase64.length > 0) {
        // Base64でエンコードされたメッセージをデコード
        const messageUtf8 = decodeBase64(messageBase64,true);
        // 最後にMessageフィールドを追加
        segRecord.push({ name: "Message", value: messageUtf8, params: [] });
    }
    // オブジェクト形式に変換
    return <T>transformToObject(segRecord);
}

export class MIMEParser {
    // MIMEエンティティ文字列を解析する静的メソッド
    public static async parseByStr(mime_entity: string) {
        mime_entity = mime_entity.replaceAll("\r","");
        // MIMEエンティティ内の改行とタブの組み合わせを削除して整形
        mime_entity = mime_entity.replaceAll(/\n\t/g, "");

        // boundaryを取得（`boundary="..."` の部分）
        const boundary = getBoundary(mime_entity);

        // boundaryを使ってMIMEエンティティを複数のセグメントに分割
        // 各セグメントは boundary の区切りで分割され、空白行を削除
        const segments = mime_entity.split(`--${boundary}`)
            .map((seg: string) => seg.split("\n").filter(Boolean));

        // セグメントをヘッダー、本文、添付ファイルに分割
        // 1つ目はヘッダー、2つ目は本文、それ以降が添付ファイル
        const [seg_head, seg_body, ...seg_attachments] = [...segments];

        // 各セグメントを対応するパラメータオブジェクトに変換
        const headerParam = parseSegment<IMIMEHeaderProps>(seg_head);
        const bodyParam = parseSegment<IMIMEBodyProps>(seg_body);
        const attachParams = seg_attachments.map((seg_attachment) => parseSegment<IMIMEAttachProps>(seg_attachment));

        // メールの基本情報を抽出（送信者、受信者、件名、本文）
        const mailInfo: MailInfo = {
            from: headerParam.from.getFieldValue().value,   // 送信者
            to: headerParam.to.getFieldValue().value,       // 受信者
            subject: headerParam.subject.getFieldValue().value, // 件名
            message: bodyParam.message?.getFieldValue().value ?? "" // 本文（未定義の場合は空文字）
        };
        const contentType = headerParam.content_type.getFieldValue().value;
        if (contentType === "multipart/signed") {
            const smailInfo:SMailInfo = {
                mailInfo:mailInfo,
                micalg:headerParam.content_type.parameter.micalg?.getFieldValue().value??"sha-256",
                protocol:"application/pkcs7-signature",
            }
            // S/MIMEオブジェクトを作成
            const s = await SMIME.init(smailInfo);
            // ヘッダーパラメータをS/MIMEオブジェクトに設定
            s.header.setProperties(headerParam);
            // 本文パラメータをS/MIMEオブジェクトに設定
            s.body.setProperties(bodyParam);
            // 添付ファイルを処理
            for (const attachParam of attachParams) {
                // 添付ファイルのパラメータを取り出してMIMEAttachオブジェクトを作成
                const param = {
                    mime_type: attachParam.content_type.getFieldValue().value,  // MIMEタイプ
                    filename: attachParam.content_disposition.parameter.filename.getFieldValue().value, // ファイル名
                    size: attachParam.content_disposition.parameter.size.getFieldValue().value,  // ファイルサイズ
                    content: attachParam.message?.getFieldValue().value,  // 添付ファイルのコンテンツ
                };
                if (param.mime_type === "application/pkcs7-signature"){
                    s.setSignature(param.content);
                }
                // MIMEAttachオブジェクトを生成
                const attach = new MIMEAttach(param.mime_type, param.filename, param.size, param.content);
                // 添付ファイルをMIMEオブジェクトに追加
                await s.attachContent(attach);
            }
            // 解析したMIMEオブジェクトを返す
            return s;
        }else if(contentType === "application/pkcs7-mime"){
            const smailInfo:SMailInfo = {
                mailInfo:mailInfo,
                micalg:headerParam.content_type.parameter.micalg?.getFieldValue().value??"sha-256",
                protocol:"application/pkcs7-signature",
            }
            // S/MIMEオブジェクトを作成
            const s = await SMIME.init(smailInfo);
            // ヘッダーパラメータをS/MIMEオブジェクトに設定
            s.header.setProperties(headerParam);
            // 本文パラメータをS/MIMEオブジェクトに設定
            s.body.setProperties(bodyParam);
            // 添付ファイルを処理
            for (const attachParam of attachParams) {
                // 添付ファイルのパラメータを取り出してMIMEAttachオブジェクトを作成
                const param = {
                    mime_type: attachParam.content_type.getFieldValue().value,  // MIMEタイプ
                    filename: attachParam.content_disposition.parameter.filename.getFieldValue().value, // ファイル名
                    size: attachParam.content_disposition.parameter.size.getFieldValue().value,  // ファイルサイズ
                    content: attachParam.message?.getFieldValue().value ?? "",  // 添付ファイルのコンテンツ
                };
                if (param.mime_type === "application/pkcs7-signature"){
                    s.setSignature(param.content);
                }
                // MIMEAttachオブジェクトを生成
                const attach = new MIMEAttach(param.mime_type, param.filename, param.size, param.content);
                // 添付ファイルをMIMEオブジェクトに追加
                await s.attachContent(attach);
            }
            // 解析したMIMEオブジェクトを返す
            return s;
        }else{
            // MIMEオブジェクトを作成
            const m = new MIME(mailInfo);

            // ヘッダーパラメータをMIMEオブジェクトに設定
            m.header.setProperties(headerParam);

            // 本文パラメータをMIMEオブジェクトに設定
            m.body.setProperties(bodyParam);

            // 添付ファイルを処理
            for (const attachParam of attachParams) {
                // 添付ファイルのパラメータを取り出してMIMEAttachオブジェクトを作成
                const param = {
                    mime_type: attachParam.content_type.getFieldValue().value,  // MIMEタイプ
                    filename: attachParam.content_disposition.parameter.filename.getFieldValue().value, // ファイル名
                    size: attachParam.content_disposition.parameter.size.getFieldValue().value,  // ファイルサイズ
                    content: attachParam.message?.getFieldValue().value  ?? "",  // 添付ファイルのコンテンツ
                };

                // MIMEAttachオブジェクトを生成
                const attach = new MIMEAttach(param.mime_type, param.filename, param.size, param.content);
                // 添付ファイルをMIMEオブジェクトに追加
                await m.attachContent(attach);
            }
            // 解析したMIMEオブジェクトを返す
            return m;
        }
    }
    public static async parseByFile(path:string):Promise<MIME|SMIME>{
        try {
            const content = await Deno.readTextFile(path); // ファイル内容を読み込む
            return MIMEParser.parseByStr(content);
        } catch (error) {
            throw error;
        }
    }
}