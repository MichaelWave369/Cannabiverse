import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {REAL_LEAF_CATALOG_VERSION,REAL_LEAF_SOURCES,
  validateRealLeafCatalog} from "../app/leaflab/real-photo-catalog.mjs";

assert.equal(REAL_LEAF_CATALOG_VERSION,"1.4");
const review=validateRealLeafCatalog();
assert.equal(review.sourceCount,5);
assert.equal(review.overlayExcludedCount,1);
assert.equal(review.status,
  "SOURCE_PAGE_METADATA_VERIFIED_ORIGINAL_FILE_BYTES_NOT_DOWNLOADED_YET");
assert.ok(REAL_LEAF_SOURCES.every(x=>
  x.originalUrl.startsWith("https://upload.wikimedia.org/wikipedia/commons/")));
assert.ok(REAL_LEAF_SOURCES.every(x=>x.commonsPage.startsWith(
  "https://commons.wikimedia.org/wiki/File:")));
assert.ok(REAL_LEAF_SOURCES.every(x=>x.originalBytes<16*1024*1024));
assert.deepEqual(new Set(REAL_LEAF_SOURCES.map(x=>x.id)).size,5);
assert.equal(REAL_LEAF_SOURCES.filter(x=>x.annotationOverlay).length,1);
assert.equal(REAL_LEAF_SOURCES.filter(x=>!x.annotationOverlay).length,4);
const marked=REAL_LEAF_SOURCES.find(x=>x.annotationOverlay);
assert.equal(marked.use,"qualitative-teaching-reference-only");
assert.ok(marked.caution.includes("EXCLUDE"));
assert.equal(REAL_LEAF_SOURCES.filter(x=>x.license==="CC0 1.0").length,1);
assert.equal(REAL_LEAF_SOURCES.filter(x=>x.license==="Public domain (PD-author)").length,1);
assert.equal(REAL_LEAF_SOURCES.filter(x=>x.license==="CC BY-SA 3.0").length,2);
assert.equal(REAL_LEAF_SOURCES.filter(x=>x.license==="CC BY 2.0").length,1);
assert.equal(REAL_LEAF_SOURCES.filter(x=>x.possibleSharedPlantGroup).length,2);
const pair=REAL_LEAF_SOURCES.filter(x=>x.possibleSharedPlantGroup);
assert.equal(pair[0].possibleSharedPlantGroup,pair[1].possibleSharedPlantGroup);
assert.throws(()=>validateRealLeafCatalog([]),/1–30/);
assert.throws(()=>validateRealLeafCatalog([...REAL_LEAF_SOURCES,
  REAL_LEAF_SOURCES[0]]),/duplicate catalog ID/);
assert.throws(()=>validateRealLeafCatalog([
  {...REAL_LEAF_SOURCES[0],originalUrl:"http://example.com/image.jpg"}
]),/Untrusted or duplicate source URL/);
assert.throws(()=>validateRealLeafCatalog([
  {...REAL_LEAF_SOURCES[0],license:"Unknown license"}
]),/Unrecognized license/);
assert.throws(()=>validateRealLeafCatalog([
  {...REAL_LEAF_SOURCES[0],sourceImageSHA1:"x".repeat(40)}
]),/SHA-1/);
assert.throws(()=>validateRealLeafCatalog([
  {...REAL_LEAF_SOURCES[0],annotationOverlay:true}
]),/Preannotated image/);
assert.throws(()=>validateRealLeafCatalog([
  {...REAL_LEAF_SOURCES[0],originalBytes:17*1024*1024}
]),/maximum size/);
assert.throws(()=>validateRealLeafCatalog([
  {...REAL_LEAF_SOURCES[0],width:-1}
]),/dimensions/);
const html=readFileSync(new URL("../app/leaflab/real-photos.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/leaflab/real-photo-ui.mjs",import.meta.url),"utf8");
const downloader=readFileSync(new URL("./fetch-leaflab-real-photos.mjs",import.meta.url),"utf8");
const nav=readFileSync(new URL("../app/leaflab/index.html",import.meta.url),"utf8");
assert.match(html,/src="\.\/real-photo-ui\.mjs"/);
assert.match(html,/id="photoCards"/);
assert.match(html,/id="sourceFilter"/);
assert.match(html,/id="downloadCatalog"/);
assert.match(nav,/real-photos\.html/);
assert.match(ui,/referrerpolicy/);
assert.match(ui,/Commons source & license/);
assert.match(ui,/originalBytesNotDownloadedByThisPage:true/);
assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(ui),
  "Browser only loads opted-in external previews; never invisibly fetches specimen bytes");
assert.match(downloader,/createHash/);
assert.match(downloader,/sourceImageSHA1/);
assert.match(downloader,/expectedSha1!==src.sourceImageSHA1/);
assert.match(downloader,/expectedSha1/);
assert.match(downloader,/computedOriginalSHA256/);
assert.match(downloader,/ATTRIBUTION\.md/);
assert.match(downloader,/photos-manifest\.json/);
assert.ok(!/octokit|git push|execSync|child_process/.test(downloader),
  "Downloader does not commit images or execute shell commands");
console.log("PASS LeafLab v1.4: five real Commons source leads, verifiable license URLs, original-size gates, no annotated-image benchmark leakage, downloader safeguards and local photo-gallery controls");
