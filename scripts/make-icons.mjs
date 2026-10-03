// Draws the app icon (a white playing card with a spade on green felt) and writes it as PNG files.
// Run with: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const FELT = [15, 74, 43];
const PAPER = [255, 253, 247];
const INK = [22, 32, 42];

// Colour of the pixel at (x, y), both between 0 and 1
function colourAt(x, y) {
  const inCard = x > 0.24 && x < 0.76 && y > 0.14 && y < 0.86;
  if (!inCard) return FELT;
  // A spade: two circles, a triangle on top of them and a small stem
  const circle = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 < r * r;
  const top = y > 0.3 && y < 0.56 && Math.abs(x - 0.5) < (y - 0.3) * 0.62;
  const stem = y > 0.56 && y < 0.7 && Math.abs(x - 0.5) < 0.02 + (y - 0.56) * 0.35;
  const spade = top || circle(0.42, 0.55, 0.085) || circle(0.58, 0.55, 0.085) || stem;
  return spade ? INK : PAPER;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const rows = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const start = y * (size * 3 + 1);
    rows[start] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = colourAt((x + 0.5) / size, (y + 0.5) / size);
      rows.set([r, g, b], start + 1 + x * 3);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits per channel, RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size));
  console.log(`public/icon-${size}.png`);
}
