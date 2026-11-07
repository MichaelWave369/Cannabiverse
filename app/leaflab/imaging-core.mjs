// Φ LeafLab v0.6 — deterministic, local-only, exploratory pixel segmentation.
// This code detects color-similar regions and dark ridges, NOT verified botanical veins.
const VERSION="0.6";
const sqrt2=Math.SQRT2;
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
function numberIn(n,low,high,label){
  if(typeof n!=="number"||!Number.isFinite(n)||n<low||n>high)
    throw new RangeError(label+" must be within "+low+".."+high);
  return n;
}
function validateImage({width,height,data}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||
     width>400||height>400||width*height>160000)
    throw new RangeError("Image must be a downsampled 16–400px rectangle (≤160,000 pixels)");
  if(!(data instanceof Uint8ClampedArray)||data.length!==width*height*4)
    throw new TypeError("RGBA image data must be a Uint8ClampedArray of width*height*4");
}
function validColor(a,label){
  if(!Array.isArray(a)||a.length!==3||a.some(n=>!Number.isInteger(n)||n<0||n>255))
    throw new TypeError(label+" must be an RGB triplet of bytes");
  return a;
}
function distSq(data,i,color){
  const offset=i*4;
  const r=data[offset]-color[0],g=data[offset+1]-color[1],b=data[offset+2]-color[2];
  return r*r+g*g+b*b;
}
function neighbors(index,width,height){
  const x=index%width,y=Math.floor(index/width),out=[];
  for(const [dx,dy] of DIRECTIONS){
    const xx=x+dx,yy=y+dy;
    if(xx>=0&&xx<width&&yy>=0&&yy<height)out.push(yy*width+xx);
  }
  return out;
}
function flood(mask,width,height,seed){
  const selected=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
  let head=0,tail=0;
  if(!mask[seed])return {mask:selected,pixels:0};
  queue[tail++]=seed;selected[seed]=1;
  while(head<tail){
    const i=queue[head++];
    for(const j of neighbors(i,width,height)){
      if(mask[j]&&!selected[j]){selected[j]=1;queue[tail++]=j;}
    }
  }
  return {mask:selected,pixels:tail};
}
function count(mask){let result=0;for(const v of mask)result+=v;return result;}
export function segmentImage({width,height,data,foreground,background,seed,
  margin=0.07}){
  validateImage({width,height,data});
  validColor(foreground,"Foreground sample");validColor(background,"Background sample");
  if(!Number.isInteger(seed)||seed<0||seed>=width*height)
    throw new RangeError("Foreground seed pixel outside image");
  numberIn(margin,-.3,.65,"Segmentation margin");
  if(foreground.every((v,i)=>Math.abs(v-background[i])<8))
    throw new RangeError("Foreground and background colors are too similar");
  const binary=new Uint8Array(width*height);
  for(let i=0;i<binary.length;i++){
    if(data[4*i+3]<64)continue; // transparent image borders are not leaf
    const df=Math.sqrt(distSq(data,i,foreground));
    const db=Math.sqrt(distSq(data,i,background));
    // Normalized distance difference is robust to overall RGB contrast.
    const score=(db-df)/(db+df+1e-9);
    binary[i]=score>margin?1:0;
  }
  // A foreground click must actually classify as foreground. Don't force it.
  if(!binary[seed])throw new RangeError("Foreground seed is outside the segmented color region; change margin or marks");
  const connected=flood(binary,width,height,seed);
  const mask=connected.mask;
  let fourEdge=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(!mask[i])continue;
    if(x===0||!mask[i-1])fourEdge++;
    if(x===width-1||!mask[i+1])fourEdge++;
    if(y===0||!mask[i-width])fourEdge++;
    if(y===height-1||!mask[i+width])fourEdge++;
  }
  return {kind:"leaflab-foreground-segmentation",version:VERSION,width,height,
    mask,seed,margin,foreground:[...foreground],background:[...background],
    pixels:connected.pixels,binaryCandidatePixels:count(binary),
    edge4PixelUnits:fourEdge,coverage:connected.pixels/(width*height),
    limitations:[
      "Color-seeded connected component, not semantic leaf recognition",
      "Single connected object selected; unattached leaflet pieces may be missed",
      "Strong shadows, similar backgrounds and highlights can cause segmentation errors",
      "4-neighbor boundary is pixel-grid length, not an accurately measured plant perimeter"
    ]};
}
export function traceVeinCandidates({width,height,data,mask,contrast=14,minPixels=6}){
  validateImage({width,height,data});
  if(!(mask instanceof Uint8Array)||mask.length!==width*height||
     mask.some(v=>v!==0&&v!==1))throw new TypeError("Vein analysis needs a binary foreground mask");
  numberIn(contrast,3,70,"Contrast threshold");
  if(!Number.isInteger(minPixels)||minPixels<2||minPixels>100)
    throw new RangeError("Minimum ridge size must be 2–100 pixels");
  const n=width*height;
  const lum=new Float32Array(n);
  for(let i=0;i<n;i++){
    const k=4*i;lum[i]=.2126*data[k]+.7152*data[k+1]+.0722*data[k+2];
  }
  // Mask-weighted integral images prevent bright exterior backgrounds from
  // becoming fake dark "veins" around the leaf's perimeter.
  const stride=width+1;
  const integral=new Float64Array((width+1)*(height+1));
  const sampleCount=new Uint32Array((width+1)*(height+1));
  for(let y=1;y<=height;y++){
    let sum=0,total=0;
    for(let x=1;x<=width;x++){
      const i=(y-1)*width+x-1;
      if(mask[i]){sum+=lum[i];total++;}
      integral[y*stride+x]=integral[(y-1)*stride+x]+sum;
      sampleCount[y*stride+x]=sampleCount[(y-1)*stride+x]+total;
    }
  }
  function average(x,y,r){
    const x0=Math.max(0,x-r),x1=Math.min(width,x+r+1),
      y0=Math.max(0,y-r),y1=Math.min(height,y+r+1);
    const sum=integral[y1*stride+x1]-integral[y0*stride+x1]-
      integral[y1*stride+x0]+integral[y0*stride+x0];
    const n=sampleCount[y1*stride+x1]-sampleCount[y0*stride+x1]-
      sampleCount[y1*stride+x0]+sampleCount[y0*stride+x0];
    return n?sum/n:lum[y*width+x];
  }
  const ridge=new Uint8Array(n);
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x;if(!mask[i])continue;
    // Mask erosion by four-connected neighbors excludes dark leaf borders.
    if(!mask[i-1]||!mask[i+1]||!mask[i-width]||!mask[i+width])continue;
    if(average(x,y,5)-lum[i]>=contrast)ridge[i]=1;
  }
  // Remove tiny connected ridge components, which are often surface noise.
  const seen=new Uint8Array(n),filtered=new Uint8Array(n);
  const queue=new Int32Array(n);
  for(let i=0;i<n;i++){
    if(!ridge[i]||seen[i])continue;
    let head=0,tail=0;queue[tail++]=i;seen[i]=1;
    while(head<tail){
      const p=queue[head++];
      for(const j of neighbors(p,width,height)){
        if(ridge[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}
      }
    }
    if(tail>=minPixels)for(let k=0;k<tail;k++)filtered[queue[k]]=1;
  }
  const thinned=thinBinary(filtered,width,height);
  const graph=skeletonGraph(thinned,width,height);
  return {kind:"leaflab-veinlike-ridge-graph",version:VERSION,
    width,height,contrast,minPixels,
    ridgePixels:count(filtered),skeletonPixels:graph.skeletonPixels,skeleton:thinned,
    graph,
    limitations:[
      "Dark ridges are vein-like image features, not authenticated botanical veins",
      "Lighting, shadows, serrations, hair, sensor noise and pigmentation may look like veins",
      "Thinning and eight-neighbor graph degrees are resolution-dependent and may form false branches",
      "Graph length is a screen-pixel proxy, not vascular conductance or flow",
      "No predictive biological routing or 3-6-9 law follows from ridge geometry"
    ]};
}
// Zhang-Suen binary thinning with a strict iteration cap; input not mutated.
export function thinBinary(source,width,height){
  if(!(source instanceof Uint8Array)||source.length!==width*height)
    throw new TypeError("Skeletonization requires correctly sized Uint8Array");
  const p=new Uint8Array(source);
  const index=(x,y)=>y*width+x;
  for(let pass=0;pass<48;pass++){
    let changed=0;
    for(let step=0;step<2;step++){
      const remove=[];
      for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
        const i=index(x,y);if(!p[i])continue;
        const k=[p[i-width],p[i-width+1],p[i+1],p[i+width+1],
          p[i+width],p[i+width-1],p[i-1],p[i-width-1]];
        const degree=k.reduce((s,v)=>s+v,0);
        if(degree<2||degree>6)continue;
        let transitions=0;
        for(let j=0;j<8;j++)if(!k[j]&&k[(j+1)%8])transitions++;
        if(transitions!==1)continue;
        if(step===0){
          if(k[0]*k[2]*k[4] || k[2]*k[4]*k[6])continue;
        }else{
          if(k[0]*k[2]*k[6] || k[0]*k[4]*k[6])continue;
        }
        remove.push(i);
      }
      for(const i of remove)p[i]=0;
      changed+=remove.length;
    }
    if(changed===0)break;
  }
  return p;
}
export function skeletonGraph(skeleton,width,height){
  if(!(skeleton instanceof Uint8Array)||skeleton.length!==width*height)
    throw new TypeError("Graph needs a binary skeleton");
  const n=skeleton.length,seen=new Uint8Array(n),queue=new Int32Array(n);
  let endpoints=0,junctionPixels=0,isolates=0,components=0,
    largestComponent=0,edgeLength=0,edges=0;
  for(let i=0;i<n;i++){
    if(!skeleton[i])continue;
    const nb=neighbors(i,width,height).filter(j=>skeleton[j]);
    if(nb.length===0)isolates++;
    if(nb.length===1)endpoints++;
    if(nb.length>=3)junctionPixels++;
    for(const j of nb){
      if(j<=i)continue;
      const dx=(j%width)-(i%width),dy=Math.floor(j/width)-Math.floor(i/width);
      edgeLength+=dx!==0&&dy!==0?sqrt2:1;edges++;
    }
    if(seen[i])continue;
    components++;let head=0,tail=0;seen[i]=1;queue[tail++]=i;
    while(head<tail){
      const current=queue[head++];
      for(const j of neighbors(current,width,height)){
        if(skeleton[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}
      }
    }
    largestComponent=Math.max(largestComponent,tail);
  }
  const pixels=count(skeleton);
  return {skeletonPixels:pixels,components,largestComponentPixels:largestComponent,
    largestComponentFraction:pixels?largestComponent/pixels:0,
    endpointPixels:endpoints,junctionPixels,isolatedPixels:isolates,
    neighborLinks:edges,neighborLinkLength:Math.round(edgeLength*1000)/1000};
}
function contains(point,poly){
  let inside=false;
  const [x,y]=point;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,yi]=poly[i],[xj,yj]=poly[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
export function compareWithManualOutlines({mask,width,height,outlines,
  frameWidth=850,frameHeight=630}){
  if(!(mask instanceof Uint8Array)||mask.length!==width*height)
    throw new TypeError("Comparison needs binary segmentation mask");
  if(!Array.isArray(outlines)||outlines.length===0||outlines.length>20||
     outlines.some(o=>!Array.isArray(o.vertices)||o.vertices.length<3||o.vertices.length>200||
       o.vertices.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))))
    throw new TypeError("Comparison requires manually traced leaflet polygons");
  numberIn(frameWidth,1,10000,"Frame width");numberIn(frameHeight,1,10000,"Frame height");
  // Original photo is rendered inside a 850x630 'meet' frame. Unproject its
  // reference points to the segmentation image, preserving aspect ratio.
  const fit=Math.min(frameWidth/width,frameHeight/height);
  const dx=(frameWidth-width*fit)/2,dy=(frameHeight-height*fit)/2;
  const polys=outlines.map(o=>o.vertices.map(([x,y])=>[(x-dx)/fit,(y-dy)/fit]));
  let both=0,manual=0,automatic=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,a=Boolean(mask[i]);
    const m=polys.some(poly=>contains([x+.5,y+.5],poly));
    automatic+=Number(a);manual+=Number(m);both+=Number(a&&m);
  }
  const union=automatic+manual-both;
  return {kind:"leaflab-manual-mask-comparison",version:VERSION,
    dimensions:{width,height,frameWidth,frameHeight},
    tracedLeafletCount:outlines.length,autoPixels:automatic,
    manualUnionPixels:manual,intersectionPixels:both,unionPixels:union,
    intersectionOverUnion:union?both/union:null,
    dice:automatic+manual?2*both/(automatic+manual):null,
    precision:automatic?both/automatic:null,
    recall:manual?both/manual:null,
    limitations:[
      "Manual polygons must be traced on the EXACT same unrotated image and orientation",
      "Filename matching is a hint only, not cryptographic proof of image identity",
      "Partial leaflet outlines cannot be used as a whole-leaf ground truth",
      "Mask agreement does not verify biological identity, vein networks or ecological function"
    ]};
}
export function imagingReport(segmentation,ridges,comparison=null){
  if(!segmentation||segmentation.kind!=="leaflab-foreground-segmentation"||
     !ridges||ridges.kind!=="leaflab-veinlike-ridge-graph"||
     segmentation.width!==ridges.width||segmentation.height!==ridges.height)
    throw new TypeError("Imaging report requires matching segmentation and ridge results");
  return {kind:"leaflab-local-imaging-audit",version:VERSION,
    status:"EXPERIMENTAL_IMAGE_PROCESSING_ONLY",
    image:{width:segmentation.width,height:segmentation.height},
    parameters:{segmentationMargin:segmentation.margin,
      foregroundRGB:segmentation.foreground,backgroundRGB:segmentation.background,
      ridgeContrast:ridges.contrast,ridgeMinimumComponent:ridges.minPixels},
    mask:{pixels:segmentation.pixels,candidatePixels:segmentation.binaryCandidatePixels,
      coverage:segmentation.coverage,gridBoundaryProxy:segmentation.edge4PixelUnits},
    veinLikeGraph:ridges.graph,
    comparison,
    limitations:[...segmentation.limitations,...ridges.limitations,
      "All processing local; input image is deliberately omitted from the report",
      "No automatic botanical ground truth, hydraulic flow or validated vein network"]
  };
}
