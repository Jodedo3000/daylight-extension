/*
 * Generates the extension icons (16 / 48 / 128 px) as PNGs with no external deps.
 * Draws a warm "sun" glyph — the light-mode motif — with 4x supersampled edges.
 * Run: node scripts/make-icons.js
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Colour of a single pixel centre (nx, ny in 0..1). Returns [r,g,b,a] 0..255.
function sample(nx, ny) {
  const cx = 0.5,
    cy = 0.5;
  const dx = nx - cx,
    dy = ny - cy;
  const d = Math.sqrt(dx * dx + dy * dy);

  // Sun body: filled disc with a soft vertical gradient (amber -> orange).
  const bodyR = 0.3;
  if (d <= bodyR) {
    const t = (ny - (cy - bodyR)) / (2 * bodyR);
    return [
      Math.round(lerp(255, 255, t)),
      Math.round(lerp(196, 148, t)),
      Math.round(lerp(61, 28, t)),
      255,
    ];
  }

  // Rays: 8 rounded dots orbiting the body.
  const rayOrbit = 0.42;
  const rayR = 0.062;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rx = cx + Math.cos(a) * rayOrbit;
    const ry = cy + Math.sin(a) * rayOrbit;
    const rd = Math.sqrt((nx - rx) ** 2 + (ny - ry) ** 2);
    if (rd <= rayR) return [255, 168, 40, 255];
  }

  return [0, 0, 0, 0]; // transparent
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4; // supersampling factor per axis
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / size;
          const ny = (y + (sy + 0.5) / SS) / size;
          const p = sample(nx, ny);
          r += p[0] * p[3];
          g += p[1] * p[3];
          b += p[2] * p[3];
          a += p[3];
        }
      }
      const n = SS * SS;
      const alpha = a / n;
      const o = (y * size + x) * 4;
      if (alpha > 0) {
        buf[o] = Math.round(r / a);
        buf[o + 1] = Math.round(g / a);
        buf[o + 2] = Math.round(b / a);
      }
      buf[o + 3] = Math.round(alpha);
    }
  }
  return buf;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // filter method 0, each scanline prefixed with filter byte 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const png = encodePNG(size, render(size));
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  console.log(`wrote icons/icon${size}.png (${png.length} bytes)`);
}
