// Φ LeafLab v1.4 · Explicit acquisition of original Wikimedia Commons photos.
// Run "npm run fetch:leaflab-photos". No background or silent image scraping.
// Images saved outside version control; provenance and licenses travel with files.
import {createHash} from "node:crypto";
import {mkdir,writeFile,rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {REAL_LEAF_SOURCES,validateRealLeafCatalog}
  from "../app/leaflab/real-photo-catalog.mjs";

validateRealLeafCatalog();
const args=process.argv.slice(2),getFlag=flag=>{
  const pos=args.indexOf(flag);
  return pos===-1?null:args[pos+1]??"";
};
const destination=getFlag("--out")||
  fileURLToPath(new URL("../.leaflab-real-photos/",import.meta.url));
const ids=getFlag("--ids")?.split(",").filter(Boolean);
if(ids&&ids.some(x=>!REAL_LEAF_SOURCES.some(s=>s.id===x)))
  throw new RangeError("Unknown catalog photo ID");
const chosen=ids?.length?REAL_LEAF_SOURCES.filter(x=>ids.includes(x.id)):
  REAL_LEAF_SOURCES;
if(!chosen.length)throw new RangeError("No catalog records selected");
const sha=(data,algo)=>createHash(algo).update(data).digest("hex");
const later=ms=>new Promise(r=>setTimeout(r,ms));
async function downloadSource(src){
  let lastError=null;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(src.originalUrl,{
        headers:{"User-Agent":"Cannabiverse-LeafLab/1.4 (open research; GitHub MichaelWave369/Cannabiverse)",
          "Accept":"image/jpeg,image/*;q=0.8"},
        signal:AbortSignal.timeout(35000),redirect:"follow"
      });
      if(!response.ok)throw new Error("HTTP "+response.status);
      if(!response.url.startsWith("https://upload.wikimedia.org/"))
        throw new Error("Unexpected download redirect host");
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length!==src.originalBytes)
        throw new Error("Byte-length mismatch: got "+bytes.length+
          " expected "+src.originalBytes);
      const expectedSha1=sha(bytes,"sha1");
      if(expectedSha1!==src.sourceImageSHA1)
        throw new Error("Wikimedia source SHA-1 mismatch: do not use altered photo");
      if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)
        throw new Error("File is not recognizable as JPEG");
      const localFile=src.id+".jpg";
      await writeFile(path.join(destination,localFile),bytes,{flag:"w"});
      return {
        id:src.id,file:localFile,sourceFile:src.commonsFile,
        originalSourceUrl:src.originalUrl,commonsPage:src.commonsPage,
        attribution:src.author,license:src.license,
        licenseUrl:src.licenseUrl,
        width:src.width,height:src.height,bytes:bytes.length,
        sourceSHA1:expectedSha1,computedOriginalSHA256:sha(bytes,"sha256"),
        use:src.use,annotationOverlay:src.annotationOverlay,
        botanicalIdentity:src.botanicalIdentity,
        caution:src.caution,sourceIdentity:src.sourceIdentity,
        ...(src.possibleSharedPlantGroup?{
          possibleSharedPlantGroup:src.possibleSharedPlantGroup
        }:{})
      };
    }catch(e){
      lastError=e;
      if(attempt<2)await later(1200*(attempt+1));
    }
  }
  throw new Error("Cannot verify "+src.id+": "+lastError.message);
}
await mkdir(destination,{recursive:true});
const entries=[];
try{
  for(const photo of chosen){
    // Sequential by design: don't hammer a volunteer-maintained photo server.
    const entry=await downloadSource(photo);
    entries.push(entry);
    console.log("VERIFIED original bytes: "+entry.id+" · "+
      entry.bytes+" bytes · SHA-256 "+entry.computedOriginalSHA256);
    await later(350);
  }
  const manifest={
    kind:"leaflab-real-source-acquisition",
    version:"1.4",status:"REAL_WEB_PHOTO_FILE_BYTES_DOWNLOADED_AND_HASHED",
    createdUTC:new Date().toISOString(),
    source:"Wikimedia Commons; individual licenses documented by source",
    photoCount:entries.length,
    inputLimitNote:"All originals are <=16 MiB and valid candidates for LeafLab v1.3 local file checks",
    scientificCaution:"Unverified source labels and botanical IDs; no authentic vascular annotations, collection vouchers or independent plants proven",
    photos:entries
  };
  await writeFile(path.join(destination,"photos-manifest.json"),
    JSON.stringify(manifest,null,2)+"\n");
  const credit=[
    "# LeafLab v1.4 · Original real-photo research pack",
    "",
    "These are original JPEG photo bytes downloaded from Wikimedia Commons;",
    "file byte counts and source-supplied SHA-1 digests were checked, then SHA-256 was computed locally.",
    "Each original is supplied with credit and its individual license. This package does NOT prove species identity, real veins, observer blinding or botanical sample independence.",
    "",
    ...entries.flatMap(p=>[
      "## "+p.sourceFile,
      "",
      "- Local filename: "+p.file,
      "- Credit: "+p.attribution,
      "- License: "+p.license+" · "+p.licenseUrl,
      "- Original source / license terms: "+p.commonsPage,
      "- Download URL: "+p.originalSourceUrl,
      "- Original bytes SHA-256: "+p.computedOriginalSHA256,
      "- Original dimensions: "+p.width+" × "+p.height,
      "- Use: "+p.use,
      "- Warning: "+p.caution,
      "- Modification: none (original photograph unaltered in package)",
      ""
    ]),
    "## Scientific and licensing notes",
    "",
    "CC BY and CC BY-SA photos require attribution. Modified versions may need",
    "ShareAlike-compatible licensing. Read each linked Commons file page and",
    "license terms before redistributing. The public-domain and CC0 entries",
    "retain source credit as research provenance even where not legally required.",
    "",
    "The photo with explanatory annotation overlays must NOT be used as blind",
    "ground truth for vein detector evaluation. Images from the same author and",
    "collection day may depict the same physical plant and must not be split",
    "between development/holdout cohorts without independent identification.",
    "",
    "No source photograph's taxonomy or botanical vascular structures have been independently validated."
  ].join("\n");
  await writeFile(path.join(destination,"ATTRIBUTION.md"),credit+"\n");
  console.log("PASS "+entries.length+" original web leaf photographs acquired. "+
    "Manifests and credit notes written to "+destination);
}catch(error){
  // Never present a partial sample pack as a complete verified study corpus.
  await Promise.all(entries.map(p=>
    rm(path.join(destination,p.file),{force:true}).catch(()=>{})));
  throw error;
}
