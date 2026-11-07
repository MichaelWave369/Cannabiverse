// Φ LeafLab v1.4 · Curated real-photograph acquisition leads.
// Sources/licenses were checked against Wikimedia Commons file-description
// pages on 2026-11-07. Metadata is NOT independent botanical authentication.
// No original images or photography ground-truth masks ship in the repo.
export const REAL_LEAF_CATALOG_VERSION="1.4";
export const REAL_LEAF_SOURCES=Object.freeze([
  {
    id:"commons-leaf-earth-pd",
    title:"Cannabis sativa leaf on textured ground",
    commonsFile:"Cannabis sativa leaf (1).jpg",
    description:"Single detached leaf with distinct leaflets against rough brown ground; useful basic masking case.",
    author:"Unknown; uploaded from Public Domain Images",
    license:"Public domain (PD-author)",
    licenseUrl:"https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_%281%29.jpg",
    commonsPage:"https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_%281%29.jpg",
    originalUrl:"https://upload.wikimedia.org/wikipedia/commons/f/f5/Cannabis_sativa_leaf_%281%29.jpg",
    sourceImageSHA1:"825dbedb876491fd92bcec01feabe42402235629",
    independentlyFetchedSHA256:"4dec1eade2d3aa0b3690f5c392c832c1602692dd35306e032af543c6dead02ff",
    originalBytes:148375,width:1024,height:680,
    use:"single-leaf-segmentation",
    annotationOverlay:false,sourceIdentity:"commons-source-claim",
    botanicalIdentity:"not-independently-verified",
    caution:"Unknown photographer and exact collection plant. Green leaf on textured surface; not a verified anatomical vein mask."
  },
  {
    id:"commons-leaf-foliage-cc0",
    title:"Cannabis leaf among overlapping foliage",
    commonsFile:"Cannabis-leaf-hemp.jpg",
    description:"Bright leaf against other green cannabis foliage; valuable hard-background stress case.",
    author:"Lode Van de Velde",
    license:"CC0 1.0",
    licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
    commonsPage:"https://commons.wikimedia.org/wiki/File:Cannabis-leaf-hemp.jpg",
    originalUrl:"https://upload.wikimedia.org/wikipedia/commons/8/81/Cannabis-leaf-hemp.jpg",
    sourceImageSHA1:"e9829574a752ef10c0a6480d5ad70c646ddd6998",
    independentlyFetchedSHA256:"3bedc723200f9f98502218e6a754b6c2c7f12907020eae5bc892758a2c6fcdf6",
    originalBytes:456200,width:1920,height:1275,
    use:"hard-background-stress",
    annotationOverlay:false,sourceIdentity:"commons-source-claim",
    botanicalIdentity:"not-independently-verified",
    caution:"Overlapping green leaves make automatic segmentation unreliable. Do not treat separate leaves as independent plants."
  },
  {
    id:"commons-leaf-dorsal-jon",
    title:"Dorsal view of detached Cannabis sativa leaf",
    commonsFile:"Cannabis sativa leaf Dorsal aspect 2012 01 23 0830.JPG",
    description:"Detached leaf on wooden tabletop with visible leaflet texture and dorsal surface.",
    author:"JonRichfield",
    license:"CC BY-SA 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/",
    commonsPage:"https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_Dorsal_aspect_2012_01_23_0830.JPG",
    originalUrl:"https://upload.wikimedia.org/wikipedia/commons/a/a8/Cannabis_sativa_leaf_Dorsal_aspect_2012_01_23_0830.JPG",
    sourceImageSHA1:"8a3467dd2c8d46b1d6a74e46ff978c02e304d89e",
    originalBytes:5112280,width:4405,height:2959,
    use:"dorsal-venation-exploration",
    annotationOverlay:false,sourceIdentity:"commons-source-claim",
    possibleSharedPlantGroup:"JonRichfield-January-2012",
    botanicalIdentity:"author-asserted-Cannabis-sativa-not-independently-verified",
    caution:"Original source labels species but no independent botanical voucher. Possible shared plant with diagnostic photo; do not split across cohorts."
  },
  {
    id:"commons-leaf-flowering-brett",
    title:"Cannabis leaves in flowering plant",
    commonsFile:"Cannabis leaves.jpg",
    description:"In-situ leaves around a flowering plant; useful demanding scene rather than a clean isolated-leaf photograph.",
    author:"Brett Levin",
    license:"CC BY 2.0",
    licenseUrl:"https://creativecommons.org/licenses/by/2.0/",
    commonsPage:"https://commons.wikimedia.org/wiki/File:Cannabis_leaves.jpg",
    originalUrl:"https://upload.wikimedia.org/wikipedia/commons/7/71/Cannabis_leaves.jpg",
    sourceImageSHA1:"39844403026470ab642d7ad74e5c86ffcf82a738",
    originalBytes:7684085,width:4928,height:3264,
    use:"in-situ-stress",
    annotationOverlay:false,sourceIdentity:"commons-source-claim",
    botanicalIdentity:"not-independently-verified",
    caution:"Many overlapping leaflets, flower structures and shadows. Not suitable for automatic single-leaf truth without independent annotation."
  },
  {
    id:"commons-leaf-venation-annotated-jon",
    title:"Diagnostic venation with annotations",
    commonsFile:"Cannabis sativa leaf diagnostic venation 2012 01 23 0829 c.jpg",
    description:"Real photo of leaf underside with overlaid explanatory labels and lines.",
    author:"JonRichfield",
    license:"CC BY-SA 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/",
    commonsPage:"https://commons.wikimedia.org/wiki/File:Cannabis_sativa_leaf_diagnostic_venation_2012_01_23_0829_c.jpg",
    originalUrl:"https://upload.wikimedia.org/wikipedia/commons/d/d4/Cannabis_sativa_leaf_diagnostic_venation_2012_01_23_0829_c.jpg",
    sourceImageSHA1:"7118d32e5bf237ce10a582a6a35890991b53d700",
    originalBytes:3415012,width:4032,height:3212,
    use:"qualitative-teaching-reference-only",
    annotationOverlay:true,sourceIdentity:"commons-source-claim",
    possibleSharedPlantGroup:"JonRichfield-January-2012",
    botanicalIdentity:"author-asserted-Cannabis-sativa-not-independently-verified",
    caution:"Contains pre-existing text, arrows and line drawings. EXCLUDE from blind segmentation/venation quantitative benchmarks."
  }
]);
const validText=x=>typeof x==="string"&&x.length>0&&x.length<800;
export function validateRealLeafCatalog(list=REAL_LEAF_SOURCES){
  if(!Array.isArray(list)||list.length<1||list.length>30)
    throw new RangeError("Photo catalog must contain 1–30 sources");
  const ids=new Set(),urls=new Set();
  for(const item of list){
    if(!item||!(/^[a-z0-9-]{4,64}$/).test(item.id)||ids.has(item.id))
      throw new TypeError("Invalid or duplicate catalog ID");
    ids.add(item.id);
    for(const name of ["title","commonsFile","description","author","license",
      "licenseUrl","commonsPage","originalUrl","use","sourceIdentity",
      "botanicalIdentity","caution"]){
      if(!validText(item[name]))throw new TypeError("Missing/invalid "+name+" in "+item.id);
    }
    const commons=new URL(item.commonsPage),original=new URL(item.originalUrl),
      license=new URL(item.licenseUrl);
    if(commons.origin!=="https://commons.wikimedia.org"||
       !commons.pathname.startsWith("/wiki/File:")||
       original.origin!=="https://upload.wikimedia.org"||
       !original.pathname.startsWith("/wikipedia/commons/")||
       urls.has(original.href)||license.protocol!=="https:")
      throw new TypeError("Untrusted or duplicate source URL "+item.id);
    urls.add(original.href);
    if(!["Public domain (PD-author)","CC0 1.0","CC BY 2.0","CC BY-SA 3.0"]
      .includes(item.license))throw new TypeError("Unrecognized license");
    if(typeof item.annotationOverlay!=="boolean"||
       typeof item.width!=="number"||!Number.isInteger(item.width)||
       typeof item.height!=="number"||!Number.isInteger(item.height)||
       item.width<16||item.height<16||item.width>16000||item.height>16000)
      throw new RangeError("Missing real image dimensions");
    if(!Number.isInteger(item.originalBytes)||item.originalBytes<100||
       item.originalBytes>16*1024*1024)
      throw new RangeError("Image exceeds local LeafLab maximum size");
    if(!/^[a-f0-9]{40}$/.test(item.sourceImageSHA1))
      throw new RangeError("Original SHA-1 metadata not supplied by Commons");
    if(item.independentlyFetchedSHA256!==undefined&&
       !/^[a-f0-9]{64}$/.test(item.independentlyFetchedSHA256))
      throw new RangeError("Invalid frozen SHA-256 observed in a real acquisition run");
    if(item.annotationOverlay&&item.use!=="qualitative-teaching-reference-only")
      throw new RangeError("Preannotated image cannot be quantitative benchmark input");
  }
  return {catalogVersion:REAL_LEAF_CATALOG_VERSION,sourceCount:ids.size,
    overlayExcludedCount:list.filter(x=>x.annotationOverlay).length,
    sizeRangeBytes:[Math.min(...list.map(x=>x.originalBytes)),
      Math.max(...list.map(x=>x.originalBytes))],
    status:"SOURCE_PAGE_METADATA_VERIFIED_ORIGINAL_FILE_BYTES_NOT_DOWNLOADED_YET"};
}
