import {MailInfo, MIME} from "./src/mime/MIME.ts";
import {MIMEParser} from "./src/parser/MIMEParser.ts";
import {SMailInfo, SMIME} from "./src/smime/SMIME.ts";
import path from "npm:path";

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

    // 完成したメールソースを取得して保存
    const pm = await MIMEParser.parseByStr(m.getMailSource());
    await Deno.writeTextFile("./mime_entityP.eml", pm.getMailSource()); // ファイルに保存

}

async function smimeMail(attachPath:string){
    const mail_info: MailInfo = {
        from: "T122063 <t122063@ed.sus.ac.jp>",
        to: "T122063 <t122063@ed.sus.ac.jp>",
        subject: "こんにちは",
        message:"あ",
    };
    const smail_info:SMailInfo = {
        mailInfo:{...mail_info,attachPaths:[attachPath]},
        protocol:"application/pkcs7-signature",
        micalg:"sha-256"
    }
    Deno.bench("計算処理のベンチマーク",async() => {

        const s = await SMIME.init(smail_info);

        await s.sign("./key/myPrivateKey.pem",smail_info.protocol,smail_info.micalg);
        // console.log("署名の検証："+await s.verify("./key/myPrivateKey.pem",smail_info.micalg));
        const fileNameWithExt = path.basename(attachPath);
        // ファイル名を取得して拡張子を除去
        const fileNameWithoutExt = fileNameWithExt.replace(path.extname(fileNameWithExt), ""); // 拡張子なしのファイル名 (例: "example")
        // await s.saveSourceString(`./bench/out/smime_${fileNameWithoutExt}.txt`); // ファイルに保存
    });
    // const parsed_s = <SMIME>await MIMEParser.parseByStr(s.getMailSource());
    //
    // // 完成したメールソースを取得して保存
    //
    // await parsed_s.saveSourceString("./out/smime_after.txt"); // ファイルに保存
    // await s.saveSourceJSON("./out/smime_before.json"); // ファイルに保存
    // await parsed_s.saveSourceJSON("./out/smime_after.json"); // ファイルに保存

}

async function smimeParse(){
    const mailSource = await Deno.readTextFile("./out/smime_before.txt");
    const parsed_s = <SMIME>await MIMEParser.parseByStr(mailSource);
}
// mimeMail関数を実行
// mimeMail();
for (const path of ["./bench/1mb.txt","./bench/50mb.txt","./bench/100mb.txt","./bench/500mb.txt"]){
    smimeMail(path);
}

