import {MailInfo, MIME} from "./MIME.ts";
import {MIMEProps} from "./MIMEBase.ts";
import {IMIMEHeaderProps} from "./MIMEHeader.ts";
import {IMIMEBodyProps} from "./MIMEBody.ts";
import {IMIMEAttachProps, MIMEAttach} from "./MIMEAttach.ts";
import {Buffer} from "node:buffer";
import {Field, HeaderFieldName, mimeHeaderToProp, MultiField, TsHeaderFieldName} from "./MIMEInfo.ts";

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
            const [fieldMainValue, ...params] = fieldValue.split(";");
            // `params` 配列の各要素（"name=value" 形式）を処理し、
            // `name` と `value` をオブジェクト形式に変換する
            const paramObjects = params.map((param: string) => {
                // `param` を "=" で分割し、最初の部分を `paramName`、残りを `paramValue` に格納
                // 正規表現 /(=.+)/ を使用して、"=" の後のすべての文字をキャプチャする
                const [paramName, paramValue] = param.split(/=(.+)/).filter(Boolean);

                // `paramValue` に含まれるダブルクオート (") をすべて削除
                // 例えば `"UTF-8"` → `UTF-8` に変換
                return {
                    name: paramName,
                    value: paramValue.replaceAll("\"", "")
                };
            });

            segRecord.push({ name: fieldName, value: fieldMainValue, params: paramObjects });
        } else {
            // フィールド値がない場合（例えばメッセージの本体）
            messageBase64 += fieldName;
            segRecord.push({ name: "", value: "", params: [] });
        }
    });

    // Base64でエンコードされたメッセージをデコード
    const messageUtf8 = Buffer.from(messageBase64, "base64").toString("utf8");

    // 最後にMessageフィールドを追加
    segRecord.push({ name: "Message", value: messageUtf8, params: [] });

    // オブジェクト形式に変換
    return <T>transformToObject(segRecord);
}

export class MIMEParser {
    // MIMEエンティティ文字列を解析する静的メソッド
    public static async parseByStr(mime_entity: string) {
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
        const header_param = parseSegment<IMIMEHeaderProps>(seg_head);
        const body_param = parseSegment<IMIMEBodyProps>(seg_body);
        const attach_params = seg_attachments.map((seg_attachment) => parseSegment<IMIMEAttachProps>(seg_attachment));

        // メールの基本情報を抽出（送信者、受信者、件名、本文）
        const mail_info: MailInfo = {
            from: header_param.from.getFieldValue().value,   // 送信者
            to: header_param.to.getFieldValue().value,       // 受信者
            subject: header_param.subject.getFieldValue().value, // 件名
            message: body_param.message?.getFieldValue().value ?? "" // 本文（未定義の場合は空文字）
        };

        // MIMEオブジェクトを作成
        const m = new MIME(mail_info);

        // ヘッダーパラメータをMIMEオブジェクトに設定
        m.header.setProperties(header_param);

        // 本文パラメータをMIMEオブジェクトに設定
        m.body.setProperties(body_param);

        // 添付ファイルを処理
        for (const attach_param of attach_params) {
            // 添付ファイルのパラメータを取り出してMIMEAttachオブジェクトを作成
            const param = {
                mime_type: attach_param.content_type.getFieldValue().value,  // MIMEタイプ
                filename: attach_param.content_disposition.parameter.filename.getFieldValue().value, // ファイル名
                size: attach_param.content_disposition.parameter.size.getFieldValue().value,  // ファイルサイズ
                content: attach_param.message.getFieldValue().value,  // 添付ファイルのコンテンツ
            };

            // MIMEAttachオブジェクトを生成
            const attach = new MIMEAttach(param.mime_type, param.filename, param.size, param.content);
            // 添付ファイルをMIMEオブジェクトに追加
            await m.attachContent(attach);
        }

        // 解析したMIMEオブジェクトを返す
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