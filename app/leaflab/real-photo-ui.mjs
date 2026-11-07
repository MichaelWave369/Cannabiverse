import {REAL_LEAF_CATALOG_VERSION,REAL_LEAF_SOURCES,validateRealLeafCatalog}
  from "./real-photo-catalog.mjs";

const catalogState=validateRealLeafCatalog();
const $=id=>document.getElementById(id);
const formatBytes=x=>x<1024*1024?(x/1024).toFixed(0)+" KiB":
  (x/(1024*1024)).toFixed(2)+" MiB";
const node=(tag,options={})=>{
  const e=document.createElement(tag);
  for(const [name,val] of Object.entries(options)){
    if(name==="text")e.textContent=val;
    else if(name==="class")e.className=val;
    else e.setAttribute(name,val);
  }
  return e;
};
function link(text,url,{external=true,primary=false}={}){
  const a=node("a",{text,href:url});
  if(external){
    a.target="_blank";
    a.rel="noopener noreferrer";
  }
  if(primary)a.setAttribute("aria-label","Open original image file: "+text);
  return a;
}
function card(p){
  const article=node("article",{class:"card"});
  const figure=node("div",{class:"photo"});
  const img=node("img",{
    src:p.originalUrl,
    alt:"External Wikimedia Commons photo: "+p.title,
    loading:"lazy",decoding:"async",
    referrerpolicy:"no-referrer"
  });
  img.addEventListener("error",()=>{
    figure.replaceChildren(node("p",{class:"small",
      text:"Preview unavailable. Use the source file link below."}));
  });
  figure.append(img);
  const body=node("div",{class:"meta"});
  body.append(node("h2",{text:p.title}));
  body.append(node("p",{text:p.description}));
  body.append(node("div",{class:"small",text:
    p.width+" × "+p.height+" px · "+formatBytes(p.originalBytes)+
    " · "+p.license}));
  body.append(node("div",{class:"small",text:"Creator: "+p.author}));
  body.append(node("div",{class:"small",text:
    "Suggested use: "+p.use.replaceAll("-"," ")}));
  body.append(node("div",{class:"warning",text:p.caution}));
  if(p.possibleSharedPlantGroup){
    body.append(node("div",{class:"warning",text:
      "Potential same-plant grouping: "+p.possibleSharedPlantGroup+
      ". Do not split correlated source images across holdout roles."}));
  }
  const actions=node("div",{class:"actions"});
  actions.append(
    link("Original JPEG",p.originalUrl,{primary:true}),
    link("Commons source & license",p.commonsPage),
    link(p.license+" terms",p.licenseUrl));
  body.append(actions);
  article.append(figure,body);
  return article;
}
function render(){
  const filter=$("sourceFilter").value;
  const filtered=REAL_LEAF_SOURCES.filter(p=>
    filter==="all"||
    filter==="ordinary"&&!p.annotationOverlay||
    filter==="reference"&&p.annotationOverlay);
  const cards=$("photoCards");
  cards.replaceChildren(...filtered.map(card));
  $("sourceCount").textContent=String(filtered.length);
}
$("sourceFilter").addEventListener("change",render);
$("downloadCatalog").addEventListener("click",()=>{
  const payload={
    kind:"leaflab-reviewed-web-source-leads",
    version:REAL_LEAF_CATALOG_VERSION,
    check:catalogState,
    originalBytesNotDownloadedByThisPage:true,
    photoCandidates:REAL_LEAF_SOURCES,
    caution:"This JSON lists Commons sources and claimed licenses; only the command-line downloader computes image SHA-256. No botanical specimens are independently authenticated."
  };
  const url=URL.createObjectURL(new Blob(
    [JSON.stringify(payload,null,2)+"\n"],{type:"application/json"}));
  const a=node("a",{href:url,download:"leaflab-v14-web-leaf-sources.json"});
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
});
render();
