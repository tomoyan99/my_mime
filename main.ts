import {MIME,MailInfo} from "./src/mime/MIME.ts";
// メールを作成して保存する関数
async function mimeMail() {
    const mail_info: MailInfo = {
        from: "T122063 <t122063@ed.sus.ac.jp>",
        to: "T122063 <t122063@ed.sus.ac.jp>",
        subject: "こんにちは",
        // message:"あああああああああああああああああああああああああああ"
    };
    const m = new MIME(mail_info);

    // 添付ファイルを追加
    await m.attachContent("./text/Hello.txt");
    await m.attachContent("./text/main_test.ts");

    // 完成したメールソースを取得して保存
    const str = m.getMailSource();
    // console.log(str); // デバッグ用
    await Deno.writeTextFile("./mime_entity.eml", str); // ファイルに保存
}

// mimeMail関数を実行
mimeMail();
