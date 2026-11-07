// Φ LeafLab v1.2 · Evidence & Validation Gateway
// Validate annotation provenance *consistency*, not biological identity.
// All uploaded records are self-asserted; no actual plant data is bundled.
import {parseVeinReference,rasterizeVeinPaths,scoreVeinLines,
  validateBenchmarkReport} from "./vein-benchmark.mjs";

export const EVIDENCE_GATEWAY_VERSION="1.2";
const MAX_RECORDS=36,MAX_OBSERVERS=3,MAX_REPORTS=72;
const validId=x=>typeof x==="string"&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(x);
const round=x=>Number(x.toFixed(6));
const average=x=>x.length?round(x.reduce((s,v)=>s+v,0)/x.length):null;
const uniqueSorted=x=>[...new Set(x)].sort((a,b)=>a.localeCompare(b));
const fieldKey=r=>r.imageSHA256+"|"+r.annotatorCode;
const pairedKey=r=>r.imageSHA256+"|"+r.observerCode;
function cleanReferences(raw){
  if(!Array.isArray(raw)||raw.length<1||raw.length>MAX_RECORDS)
    throw new RangeError("Provide 1–36 v0.7 human or synthetic annotation records");
  const refs=raw.map(parseVeinReference),origins=new Set(refs.map(r=>r.origin));
  if(origins.size!==1)
    throw new RangeError("Cannot combine synthetic and manual reference observations");
  const imageMap=new Map(),specimenHashes=new Map(),observerKeys=new Set();
  for(const r of refs){
    const key=fieldKey(r);
    if(observerKeys.has(key))
      throw new RangeError("Duplicate observer on the same image SHA-256");
    observerKeys.add(key);
    if(specimenHashes.has(r.specimenId)&&specimenHashes.get(r.specimenId)!==r.imageSHA256)
      throw new RangeError("Specimen ID reused across different source images");
    specimenHashes.set(r.specimenId,r.imageSHA256);
    let row=imageMap.get(r.imageSHA256);
    if(!row){
      row={hash:r.imageSHA256,specimenId:r.specimenId,plantId:r.plantId,
        width:r.width,height:r.height,origin:r.origin,references:[]};
      imageMap.set(r.imageSHA256,row);
    }
    if(row.specimenId!==r.specimenId||row.plantId!==r.plantId||
       row.width!==r.width||row.height!==r.height||row.origin!==r.origin)
      throw new RangeError("Same image SHA-256 has conflicting plant, specimen, dimensions or origin");
    row.references.push(r);
    if(row.references.length>MAX_OBSERVERS)
      throw new RangeError("At most 3 masked observers per image");
  }
  const images=[...imageMap.values()].sort((a,b)=>a.hash.localeCompare(b.hash));
  for(const r of images)r.references.sort((a,b)=>a.annotatorCode.localeCompare(b.annotatorCode));
  return {refs,images,origin:refs[0].origin,
    plantIds:uniqueSorted(refs.map(r=>r.plantId))};
}
function scoreImagePair(a,b,width,height,tolerance){
  const first=rasterizeVeinPaths(a),second=rasterizeVeinPaths(b);
  // The symmetric F1 is the agreement between two uncertain descriptions.
  const score=scoreVeinLines({prediction:first,reference:second,
    width,height,tolerance});
  return {
    observerA:a.annotatorCode,observerB:b.annotatorCode,
    pixelsA:score.candidatePixels,pixelsB:score.referencePixels,
    agreementF1:score.f1,
    matchedAFraction:score.precision,matchedBFraction:score.recall,
    tolerancePixels:tolerance
  };
}
export function auditObserverAgreement(records,{tolerance=2}={}){
  if(!Number.isInteger(tolerance)||tolerance<0||tolerance>3)
    throw new RangeError("Observer agreement tolerance must be an integer 0–3 pixels");
  const cohort=cleanReferences(records),images=[],plants=new Map();
  for(const group of cohort.images){
    const pairs=[];
    for(let i=0;i<group.references.length;i++){
      for(let j=i+1;j<group.references.length;j++){
        pairs.push(scoreImagePair(group.references[i],group.references[j],
          group.width,group.height,tolerance));
      }
    }
    const record={
      specimenId:group.specimenId,plantId:group.plantId,
      imageSHA256:group.hash,width:group.width,height:group.height,
      observerCodes:group.references.map(r=>r.annotatorCode),
      observerCount:group.references.length,pairCount:pairs.length,
      meanPairAgreementF1:average(pairs.map(p=>p.agreementF1).filter(x=>x!==null)),
      pairs,reviewStatus:pairs.length?"PAIRED_REVIEW_AVAILABLE":"INDEPENDENT_REVIEW_MISSING"
    };
    images.push(record);
    const rows=plants.get(group.plantId)||[];rows.push(record);plants.set(group.plantId,rows);
  }
  const plantSummaries=[...plants].sort(([a],[b])=>a.localeCompare(b))
    .map(([plantId,rows])=>{
      const paired=rows.filter(r=>r.pairCount>0);
      return {
        plantId,imageCount:rows.length,
        pairedImageCount:paired.length,unpairedImageCount:rows.length-paired.length,
        meanImageAgreementF1:average(paired.map(x=>x.meanPairAgreementF1)
          .filter(x=>x!==null))
      };
    });
  return {
    kind:"leaflab-observer-agreement-audit",version:EVIDENCE_GATEWAY_VERSION,
    evidenceStatus:cohort.origin==="synthetic-demo"?
      "SYNTHETIC_FIXTURE_ONLY":"SELF_ASSERTED_MANUAL_ANNOTATIONS_NOT_ANATOMICAL_TRUTH",
    tolerancePixels:tolerance,referenceCount:cohort.refs.length,
    imageCount:cohort.images.length,assertedPlantCount:cohort.plantIds.length,
    pairedImageCount:images.filter(r=>r.pairCount>0).length,
    unpairedImageCount:images.filter(r=>!r.pairCount).length,
    plantIds:cohort.plantIds,plantSummaries,images,
    limitations:[
      "Same-image agreement is not botanical vein verification or human observer blinding",
      "Image SHA-256 and identifiers are supplied by JSON; without original file bytes this audit cannot authenticate them",
      "No reference image is included; this software cannot check whether photos depict cannabis or actual vessels",
      "Synthetic and manual references are never pooled",
      "Observer groups are limited to three; repeated images belong to one asserted plant",
      "Pairs and images are correlated; these are descriptive mean agreement scores, not independent samples",
      "A single observer has no agreement score; missing reviews are not counted as perfect agreement"
    ]
  };
}
export function makeExplicitPlantSplit(agreement,developmentPlantIds,holdoutPlantIds){
  if(!agreement||agreement.kind!=="leaflab-observer-agreement-audit"||
     agreement.version!==EVIDENCE_GATEWAY_VERSION)
    throw new TypeError("Build plant split from a validated v1.2 agreement audit");
  for(const [name,values] of [["Development",developmentPlantIds],["Holdout",holdoutPlantIds]]){
    if(!Array.isArray(values)||!values.length||values.some(x=>!validId(x))||
       new Set(values).size!==values.length)
      throw new RangeError(name+" plant IDs must be a nonempty unique list of valid IDs");
  }
  const dev=uniqueSorted(developmentPlantIds),test=uniqueSorted(holdoutPlantIds),
    observed=agreement.plantIds;
  if(dev.some(x=>test.includes(x)))
    throw new RangeError("Development and holdout plant ID leakage");
  if(uniqueSorted([...dev,...test]).join("|")!==observed.join("|"))
    throw new RangeError("Every observed plant must be assigned exactly once; unknown plants rejected");
  const byImage=new Map(agreement.images.map(x=>[x.imageSHA256,x]));
  const images=agreement.images.map(x=>({
    specimenId:x.specimenId,plantId:x.plantId,imageSHA256:x.imageSHA256,
    assignedRole:dev.includes(x.plantId)?"development":"holdout"
  }));
  if(new Set(images.map(x=>x.imageSHA256)).size!==byImage.size)
    throw new RangeError("Image hash is repeated across split roles");
  return {
    kind:"leaflab-explicit-plant-partition",version:EVIDENCE_GATEWAY_VERSION,
    status:"SELF_DECLARED_PLANT_SPLIT_NOT_CRYPTOGRAPHICALLY_FROZEN",
    evidenceStatus:agreement.evidenceStatus,developmentPlantIds:dev,
    holdoutPlantIds:test,images,
    developmentImages:images.filter(x=>x.assignedRole==="development").length,
    holdoutImages:images.filter(x=>x.assignedRole==="holdout").length,
    limitations:[
      "A browser export is not a registered protocol or immutable preregistration",
      "Plant IDs, species and provenance are self asserted; an independent reviewer must verify them",
      "The split is at asserted plant ID, not arbitrary image or observer level",
      "The app cannot prove which images or configurations have previously been viewed or tuned"
    ]
  };
}
const scoreKeys=["masked-local-ridge","global-darkness-baseline"];
function validCompatibleReports(reports,agreement){
  if(!Array.isArray(reports)||reports.length>MAX_REPORTS)
    throw new RangeError("Import 0–72 v0.7 detector benchmark reports");
  const byHash=new Map(agreement.images.map(x=>[x.imageSHA256,x]));
  const seen=new Set(),accepted=[];
  let commonSettings=null;
  for(const raw of reports){
    const r=validateBenchmarkReport(raw);
    const img=byHash.get(r.imageSHA256);
    if(!img)throw new RangeError("Detector report image is not in annotation cohort");
    if(r.plantId!==img.plantId||r.specimenId!==img.specimenId||
       r.width!==img.width||r.height!==img.height)
      throw new RangeError("Detector report plant/specimen/dimensions mismatch");
    if(!img.observerCodes.includes(r.observerCode))
      throw new RangeError("Detector report observer missing from source annotation cohort");
    if(agreement.evidenceStatus==="SYNTHETIC_FIXTURE_ONLY"?
      r.evidenceLevel!=="SYNTHETIC_DEMONSTRATION":
      r.evidenceLevel!=="USER_ASSERTED_HUMAN_REFERENCE_NOT_BOTANICAL_TRUTH")
      throw new RangeError("Detector report synthetic/manual origin mismatch");
    const key=pairedKey(r);
    if(seen.has(key))throw new RangeError("Duplicate image/observer detector report");
    seen.add(key);
    const p=r.parameters;
    if(!p||!Number.isFinite(p.margin)||!Number.isFinite(p.contrast)||
       !Number.isInteger(p.minPixels)||!Number.isInteger(p.tolerancePixels))
      throw new TypeError("Detector report lacks declared v0.7 algorithm parameters");
    const signature=JSON.stringify([p.margin,p.contrast,p.minPixels,p.tolerancePixels]);
    if(commonSettings===null)commonSettings=signature;
    else if(signature!==commonSettings)
      throw new RangeError("Detector parameter drift across study images; use one common protocol");
    if(p.tolerancePixels!==agreement.tolerancePixels)
      throw new RangeError("Detector matching tolerance differs from observer agreement tolerance");
    for(let i=0;i<2;i++)if(r.detectors[i].detector!==scoreKeys[i])
      throw new TypeError("Expected frozen local ridge and global darkness baselines");
    accepted.push(r);
  }
  return {accepted,commonSettings:commonSettings?JSON.parse(commonSettings):null};
}
export function summarizePlantHoldout(agreement,partition,reports=[]){
  if(!agreement||agreement.kind!=="leaflab-observer-agreement-audit"||
     !partition||partition.kind!=="leaflab-explicit-plant-partition"||
     partition.version!==EVIDENCE_GATEWAY_VERSION)
    throw new TypeError("Require compatible observer audit and explicit plant partition");
  const refIds=new Set(agreement.plantIds);
  if(partition.developmentPlantIds.some(x=>!refIds.has(x))||
    partition.holdoutPlantIds.some(x=>!refIds.has(x))||
    new Set([...partition.developmentPlantIds,...partition.holdoutPlantIds]).size!==
      agreement.plantIds.length)
    throw new RangeError("Partition does not match audited plant cohort");
  const index=new Map(agreement.images.map(x=>[x.imageSHA256,x]));
  if(partition.images.length!==agreement.images.length||
      partition.images.some(x=>!index.has(x.imageSHA256)||
        index.get(x.imageSHA256).plantId!==x.plantId||
        (x.assignedRole!==(partition.developmentPlantIds.includes(x.plantId)?
          "development":"holdout"))))
    throw new RangeError("Partition image mapping differs from current observer audit");
  const {accepted,commonSettings}=validCompatibleReports(reports,agreement);
  const roles=[["development",partition.developmentPlantIds],
    ["holdout",partition.holdoutPlantIds]];
  const byPlant=new Map();
  for(const report of accepted){
    const rows=byPlant.get(report.plantId)||[];
    rows.push(report);byPlant.set(report.plantId,rows);
  }
  const summaries=roles.map(([role,plants])=>{
    const perPlant=plants.map(plantId=>{
      const rows=byPlant.get(plantId)||[];
      const images=agreement.images.filter(x=>x.plantId===plantId);
      const models=scoreKeys.map((name,i)=>({
        detector:name,meanReferenceF1:average(rows.map(r=>r.detectors[i].f1)
          .filter(x=>x!==null)),scoredObserverReports:rows.length
      }));
      return {plantId,annotatedImages:images.length,
        pairedImages:images.filter(x=>x.pairCount>0).length,
        detectorReports:rows.length,detectors:models};
    });
    const models=scoreKeys.map((name,i)=>{
      const values=perPlant.map(x=>x.detectors[i].meanReferenceF1)
        .filter(x=>x!==null);
      return {detector:name,meanOfPlantMeansF1:average(values),
        contributingPlantCount:values.length,
        totalAssignedPlants:plants.length};
    });
    return {role,plantCount:plants.length,
      annotatedImages:perPlant.reduce((s,x)=>s+x.annotatedImages,0),
      pairedImages:perPlant.reduce((s,x)=>s+x.pairedImages,0),
      detectorReports:perPlant.reduce((s,x)=>s+x.detectorReports,0),
      perPlant,detectors:models};
  });
  return {
    kind:"leaflab-heldout-evidence-gateway",version:EVIDENCE_GATEWAY_VERSION,
    evidenceStatus:agreement.evidenceStatus,
    conclusionStatus:accepted.length?
      "EXPLORATORY_USER_SUPPLIED_NUMERIC_REPORTS_NOT_RECOMPUTED":
      "ANNOTATIONS_ONLY_NO_DETECTOR_REPORTS",
    partitionStatus:partition.status,
    referenceCount:agreement.referenceCount,imageCount:agreement.imageCount,
    observedPlantCount:agreement.assertedPlantCount,
    pairedImageCount:agreement.pairedImageCount,
    unpairedImageCount:agreement.unpairedImageCount,
    detectorReportCount:accepted.length,
    settings:commonSettings?{
      colorMargin:commonSettings[0],ridgeContrast:commonSettings[1],
      minRidgeComponentPixels:commonSettings[2],tolerancePixels:commonSettings[3]
    }:null,
    groups:summaries,
    limitations:[
      "The split is checked for asserted plant/hash leakage, not independently attested provenance",
      "Imported v0.7 model scores are UNSIGNED, UNVERIFIED JSON: this gateway does not re-run the models",
      "Mean-of-plant-means weights plants equally, not images/observers; missing plants are excluded and counted",
      "This analysis does not establish pre-registration or untouched holdout status",
      "Interobserver agreement is not botanical truth or proof of independent blinded annotation",
      "No inferential statistics or biological/engineering superiority claims",
      "No legitimate data is bundled; software demos use synthetic annotations only"
    ]
  };
}
export function syntheticEvidenceDemo(){
  // One deterministic synthetic image per plant, each with two explicitly
  // synthetic "observers"; NOT cannabis or independent human annotations.
  const lines=[
    ["DEMO_A","DEMO_PLANT_A",36],
    ["DEMO_B","DEMO_PLANT_B",40]
  ];
  return lines.flatMap(([specimenId,plantId,x],i)=>[0,1].map(k=>({
    kind:"leaflab-vein-reference",version:"0.7",
    specimenId,plantId,annotatorCode:k?"MOCK_B":"MOCK_A",
    imageSHA256:(i?"b":"a").repeat(64),sourceFilename:"SYNTHETIC_ONLY.png",
    width:80,height:72,origin:"synthetic-demo",
    paths:[[[x+k,16],[x+k,54]]]
  })));
}
