// Write an offline ZIP using only Node built-ins; no system zip program is needed.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, "MANIFEST.json"), "utf8"));
const names = ["MANIFEST.json", ...manifest.files.map((item) => item.path)].sort();
const prefix = "TMA_Signal_Encryption_Demonstrator_Web/";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const localRecords = [];
const directoryRecords = [];
let offset = 0;
for (const relative of names) {
  const name = Buffer.from(prefix + relative, "utf8");
  const bytes = await readFile(path.join(root, relative));
  const compressed = deflateRawSync(bytes, { level: 9 });
  const checksum = crc32(bytes);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6); // UTF-8 file names.
  header.writeUInt16LE(8, 8); // Raw DEFLATE.
  header.writeUInt16LE(33, 12); // 1980-01-01: stable archive metadata.
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(bytes.length, 22);
  header.writeUInt16LE(name.length, 26);
  localRecords.push(header, name, compressed);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  header.copy(entry, 6, 4, 30);
  entry.writeUInt32LE(offset, 42);
  directoryRecords.push(entry, name);
  offset += header.length + name.length + compressed.length;
}

const directory = Buffer.concat(directoryRecords);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(names.length, 8);
end.writeUInt16LE(names.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
await mkdir(path.join(root, "release"), { recursive: true });
const destination = path.join(root, "release", "TMA_Signal_Encryption_Demonstrator_Web_v1.0.zip");
await writeFile(destination, Buffer.concat([...localRecords, directory, end]));
console.log(`Offline ZIP: ${destination}`);
