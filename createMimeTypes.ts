import db from "npm:mime-db"
import * as fs from 'node:fs';

function createMimeTypes() {
    // console.log(db)
    const mimeTypes = Object.keys(db);
    const typeDefinitions = mimeTypes.map(type => `'${type}'`).join('\n| ');
    const output = `export type MIMEType = \n${typeDefinitions};`;

    fs.writeFileSync('MimeType.d.ts', output);
}
createMimeTypes()