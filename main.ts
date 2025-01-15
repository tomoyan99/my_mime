import {MailInfo, MIME} from "./src/mime/MIME.ts";
import {MIMEParser} from "./src/parser/MIMEParser.ts";
import {SMailInfo, SMIME} from "./src/smime/SMIME.ts";

// メールを作成して保存する関数
async function mimeMail() {
    const mail_info: MailInfo = {
        from: "T122063 <t122063@ed.sus.ac.jp>",
        to: "T122063 <t122063@ed.sus.ac.jp>",
        subject: "こんにちは",
        message:"あああああああああああああああああああああああああああ"
    };
    const m = new MIME(mail_info);

    // 添付ファイルを追加
    await m.attachContent("./text/Hello.txt");
    await m.attachContent("./text/main_test.ts");
    await m.attachContent("./text/smime.p7s");

    // 完成したメールソースを取得して保存
    const str = m.getMailSource();
    await Deno.writeTextFile("./mime_entity.eml", str); // ファイルに保存

    const parsed_m = await MIMEParser.parseByStr(str);

    // 完成したメールソースを取得して保存
    const str2 = parsed_m.getMailSource();
    // console.log(str); // デバッグ用
    await Deno.writeTextFile("./mime_entity2.eml", str2); // ファイルに保存

}

async function smimeMail(){
    const mail_info: MailInfo = {
        from: "T122063 <t122063@ed.sus.ac.jp>",
        to: "T122063 <t122063@ed.sus.ac.jp>",
        subject: "こんにちは",
        message:"あああああああああああああああああああああああああああ",
    };
    const smail_info:SMailInfo = {
        mailInfo:{...mail_info,attachPaths:["text/Hello.txt"]},
        protocol:"application/pkcs7-signature",
        micalg:"sha-256"
    }
    const s = await SMIME.init(smail_info);

    await s.sign("./key/myPrivateKey.pem",smail_info.protocol,smail_info.micalg);
    console.log("署名の検証："+await s.verify("./key/myPrivateKey.pem",smail_info.micalg));

    const parsed_s = <SMIME>await MIMEParser.parseByStr(s.getMailSource());

    // 完成したメールソースを取得して保存

    await s.saveSourceString("./out/smime_before.txt"); // ファイルに保存
    await parsed_s.saveSourceString("./out/smime_after.txt"); // ファイルに保存
    await s.saveSourceJSON("./out/smime_before.json"); // ファイルに保存
    await parsed_s.saveSourceJSON("./out/smime_after.json"); // ファイルに保存

}
// mimeMail関数を実行
// mimeMail();

smimeMail();