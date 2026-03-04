// Generate minimal PNG icons for PWA
// Run: bun scripts/generate-icons.ts

// Simple 1x1 purple PNG as placeholder — replace with real icons later
// For now, this unblocks installability

const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function createMinimalPng(size: number): Uint8Array {
  // Create a very simple PNG with a solid purple (#6c63ff) fill
  // This is a minimal valid PNG — enough for PWA installability
  const width = size;
  const height = size;

  // IHDR chunk
  const ihdr = new Uint8Array(25);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, 13); // chunk length
  ihdr.set([0x49, 0x48, 0x44, 0x52], 4); // "IHDR"
  ihdrView.setUint32(8, width);
  ihdrView.setUint32(12, height);
  ihdr[16] = 8; // bit depth
  ihdr[17] = 2; // color type (RGB)
  ihdr[18] = 0; // compression
  ihdr[19] = 0; // filter
  ihdr[20] = 0; // interlace
  const ihdrCrc = crc32(ihdr.slice(4, 21));
  ihdrView.setUint32(21, ihdrCrc);

  // IDAT chunk - raw image data (uncompressed with zlib wrapper)
  const rawRow = new Uint8Array(1 + width * 3); // filter byte + RGB per pixel
  rawRow[0] = 0; // no filter
  for (let x = 0; x < width; x++) {
    rawRow[1 + x * 3] = 0x6c;     // R
    rawRow[1 + x * 3 + 1] = 0x63; // G
    rawRow[1 + x * 3 + 2] = 0xff; // B
  }

  // Build raw data for all rows
  const rawData = new Uint8Array(height * rawRow.length);
  for (let y = 0; y < height; y++) {
    rawData.set(rawRow, y * rawRow.length);
  }

  // Compress with zlib (Bun's built-in)
  const compressed = Bun.deflateSync(rawData, { level: 9 });

  // Wrap in zlib format
  const zlibData = new Uint8Array(compressed.length + 6);
  zlibData[0] = 0x78; // CMF
  zlibData[1] = 0x9c; // FLG
  zlibData.set(compressed, 2);
  const adler = adler32(rawData);
  const adlerView = new DataView(zlibData.buffer, zlibData.byteOffset);
  adlerView.setUint32(compressed.length + 2, adler);

  const idat = new Uint8Array(zlibData.length + 12);
  const idatView = new DataView(idat.buffer);
  idatView.setUint32(0, zlibData.length);
  idat.set([0x49, 0x44, 0x41, 0x54], 4); // "IDAT"
  idat.set(zlibData, 8);
  const idatCrc = crc32(idat.slice(4, 8 + zlibData.length));
  idatView.setUint32(8 + zlibData.length, idatCrc);

  // IEND chunk
  const iend = new Uint8Array(12);
  const iendView = new DataView(iend.buffer);
  iendView.setUint32(0, 0); // chunk length
  iend.set([0x49, 0x45, 0x4e, 0x44], 4); // "IEND"
  const iendCrc = crc32(iend.slice(4, 8));
  iendView.setUint32(8, iendCrc);

  // Combine
  const png = new Uint8Array(PNG_HEADER.length + ihdr.length + idat.length + iend.length);
  let offset = 0;
  png.set(PNG_HEADER, offset); offset += PNG_HEADER.length;
  png.set(ihdr, offset); offset += ihdr.length;
  png.set(idat, offset); offset += idat.length;
  png.set(iend, offset);

  return png;
}

// CRC32 for PNG chunks
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Adler32 for zlib
function adler32(data: Uint8Array): number {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// Generate both sizes
const dir = "./src/client";
await Bun.write(`${dir}/icon-192.png`, createMinimalPng(192));
await Bun.write(`${dir}/icon-512.png`, createMinimalPng(512));
console.log("Generated icon-192.png and icon-512.png");
