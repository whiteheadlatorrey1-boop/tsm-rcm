#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const OUTPUT_SCHEMA = `
Return ONLY valid JSON.

{
  "engine":"",
  "status":"complete",
  "confidence":0,

  "summary":"",

  "findings":[],
  "risks":[],
  "actions":[],
  "needs":[],

  "metrics":{}
}

Rules:

- Maximum 5 findings
- Maximum 5 risks
- Maximum 5 actions
- Summary under 40 words
- Never write essays
- Never explain reasoning unless requested
- Keep total output under 450 tokens.
`;

function walk(dir){

    const files=[];

    for(const item of fs.readdirSync(dir)){

        const full=path.join(dir,item);

        if(fs.statSync(full).isDirectory()){

            files.push(...walk(full));

        }else if(item.endsWith(".js")){

            files.push(full);

        }

    }

    return files;
}

const files=walk(ROOT);

let updated=0;

files.forEach(file=>{

    let txt=fs.readFileSync(file,"utf8");

    if(!txt.includes("ENGINE_PROMPT")) return;

    txt=txt.replace(
        /SYSTEM PROMPT[\s\S]*?END SYSTEM PROMPT/,
        "SYSTEM PROMPT\n"+OUTPUT_SCHEMA+"\nEND SYSTEM PROMPT"
    );

    fs.writeFileSync(file,txt);

    updated++;

});

console.log("Updated",updated,"engines");