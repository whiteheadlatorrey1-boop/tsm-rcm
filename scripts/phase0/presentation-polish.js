

const fs=require("fs");


console.log(
"TSM Presentation Audit"
);


const htmlFiles=[];


function scan(dir){

if(!fs.existsSync(dir))
return;


for(const file of fs.readdirSync(dir)){

const p=
dir+"/"+file;


if(fs.statSync(p).isDirectory())
scan(p);


if(file.endsWith(".html"))
htmlFiles.push(p);

}

}


scan("html");


console.log(
"HTML FILES:",
htmlFiles.length
);


