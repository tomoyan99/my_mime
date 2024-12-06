
class Body{
    text:string;
    html:string;
    [key:string]:string;
    constructor() {
        this.text = "Hello, World!";
        this.html = "<h1>Hello, World!</h1>";
    }
}

// 文字列を使ってアクセス
const keys: string[] = ["text","html"];
const body = new Body();
for (const key of keys) {
    console.log(body[key]); // "Hello, World!"
}
