const fs = require("fs");
const zlib = require("zlib");
const path =
  "data/Dashboard-Indicators-EWENE_DA_6_26_2026-Final-Copy-812685.docx";
const buf = fs.readFileSync(path);

function extractZip(buf) {
  const out = {};
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const cdCount = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < cdCount; n++) {
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const compSize = buf.readUInt32LE(off + 20);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString();
    const ln = buf.readUInt16LE(localOff + 26);
    const lex = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + ln + lex;
    const method = buf.readUInt16LE(off + 10);
    let data = buf.slice(dataStart, dataStart + compSize);
    if (method === 8) data = zlib.inflateRawSync(data);
    out[name] = data;
    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const zip = extractZip(buf);
const xml = zip["word/document.xml"].toString("utf8");
const text = xml
  .replace(/<w:tab[^>]*\/>/g, "\t")
  .replace(/<w:br[^>]*\/>/g, "\n")
  .replace(/<\/w:p>/g, "\n")
  .replace(/<w:tr>/g, "\n| ")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");
fs.writeFileSync("_dash.txt", text);
const lines = text.split("\n").filter((l) => l.trim());
console.log(lines.length, "non-empty lines");
console.log(lines.slice(0, 120).join("\n"));
