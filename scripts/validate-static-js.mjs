import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root=process.cwd();
const htmlRoot=path.join(root,"app");

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(p));
    else if(entry.isFile()&&entry.name.endsWith(".html"))out.push(p);
  }
  return out;
}

let scripts=0;
for(const file of walk(htmlRoot)){
  const html=fs.readFileSync(file,"utf8");
  const re=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match,index=0;
  while((match=re.exec(html))){
    index++;
    const openTag=html.slice(match.index,html.indexOf(">",match.index)+1);
    if(/\bsrc\s*=/.test(openTag))continue;
    const code=match[1];
    if(!code.trim())continue;
    scripts++;
    try{
      new vm.Script(code,{filename:path.relative(root,file)+"#inline-"+index});
    }catch(error){
      console.error("INVALID inline JavaScript:",path.relative(root,file),"script",index);
      throw error;
    }
  }
  console.log("PASS  "+path.relative(root,file));
}
console.log("");
console.log("VALID  static HTML JavaScript: "+scripts+" inline scripts parse successfully.");
