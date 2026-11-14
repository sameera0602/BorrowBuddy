const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, getPixel) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image bytes: each scanline starts with filter byte 0
  const scanlineSize = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineSize;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Function to draw BorrowBuddy Icon
// Colors:
// Navy: #132238 (19, 34, 56)
// Gold/Yellow: #FFB800 (255, 184, 0)
// Coral: #FF6B6B (255, 107, 107)
// White: #FFFFFF (255, 255, 255)
// Cream: #FBF9F4 (251, 249, 244)

function renderBorrowBuddyPixel(x, y, width, height, isMaskable) {
  const cx = width / 2;
  const cy = height / 2;
  const scale = width / 512;

  // Background
  const bgNavy = [19, 34, 56, 255];
  const gold = [255, 184, 0, 255];
  const coral = [255, 107, 107, 255];
  const white = [255, 255, 255, 255];
  const cream = [251, 249, 244, 255];

  if (isMaskable) {
    // Fill entire canvas for maskable icon
    // Inner emblem centered with safe area (within 80% circle)
  } else {
    // Rounded corner card for standard app icon
    const radius = 90 * scale;
    // Check if inside rounded rectangle
    const insideX = Math.abs(x - cx) <= (width / 2 - radius);
    const insideY = Math.abs(y - cy) <= (height / 2 - radius);
    if (!insideX && !insideY) {
      const cornerDx = Math.abs(x - cx) - (width / 2 - radius);
      const cornerDy = Math.abs(y - cy) - (height / 2 - radius);
      if (cornerDx * cornerDx + cornerDy * cornerDy > radius * radius) {
        return [0, 0, 0, 0]; // Transparent outside
      }
    }
  }

  // Draw background: gradient / subtle depth from navy #132238 to slightly deeper #0E1827
  const depthFactor = (y / height) * 15;
  let r = Math.max(10, 19 - depthFactor);
  let g = Math.max(18, 34 - depthFactor);
  let b = Math.max(32, 56 - depthFactor);

  // Draw stylish outer accent ring
  const distFromCenter = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
  const ringRadius = 185 * scale;
  const ringThickness = 6 * scale;
  if (Math.abs(distFromCenter - ringRadius) < ringThickness) {
    const angle = Math.atan2(y - cy, x - cx);
    if (angle > -1.5 && angle < 1.5) {
      return gold;
    } else {
      return coral;
    }
  }

  // Draw dual overlapping "B"s / Infinity exchange loop emblem in center
  // Center is cx, cy. Let's create two interlocking loops/circles:
  // Left circle center: cx - 55*scale, cy
  // Right circle center: cx + 55*scale, cy
  // Outer radius: 85*scale, Inner radius: 45*scale
  const leftDist = Math.sqrt((x - (cx - 55 * scale)) ** 2 + (y - cy) ** 2);
  const rightDist = Math.sqrt((x - (cx + 55 * scale)) ** 2 + (y - cy) ** 2);

  const loopOuter = 85 * scale;
  const loopInner = 45 * scale;

  const inLeftLoop = leftDist <= loopOuter && leftDist >= loopInner;
  const inRightLoop = rightDist <= loopOuter && rightDist >= loopInner;

  if (inLeftLoop && inRightLoop) {
    // Intersection: blend gold and coral
    return [255, 145, 50, 255];
  } else if (inLeftLoop) {
    // Left loop is Gold
    return gold;
  } else if (inRightLoop) {
    // Right loop is Coral
    return coral;
  }

  // Central connecting badge: Small cream circle with navy dot
  const centerBadgeDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (centerBadgeDist <= 22 * scale && centerBadgeDist >= 12 * scale) {
    return cream;
  }

  // Small stars / sparkles at top-right and bottom-left
  const spark1Dist = Math.sqrt((x - (cx + 120 * scale)) ** 2 + (y - (cy - 120 * scale)) ** 2);
  if (spark1Dist < 12 * scale) return gold;

  const spark2Dist = Math.sqrt((x - (cx - 120 * scale)) ** 2 + (y - (cy + 120 * scale)) ** 2);
  if (spark2Dist < 10 * scale) return coral;

  return [Math.round(r), Math.round(g), Math.round(b), 255];
}

const publicDir = path.join(__dirname, 'frontend', 'public');

console.log('Generating PWA icons...');

// 1. pwa-192x192.png
const pwa192 = encodePNG(192, 192, (x, y, w, h) => renderBorrowBuddyPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('Generated pwa-192x192.png');

// 2. pwa-512x512.png
const pwa512 = encodePNG(512, 512, (x, y, w, h) => renderBorrowBuddyPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Generated pwa-512x512.png');

// 3. maskable-icon-512x512.png
const maskable512 = encodePNG(512, 512, (x, y, w, h) => renderBorrowBuddyPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png'), maskable512);
console.log('Generated maskable-icon-512x512.png');

// 4. apple-touch-icon.png (180x180)
const appleIcon = encodePNG(180, 180, (x, y, w, h) => renderBorrowBuddyPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('Generated apple-touch-icon.png');

// 5. favicon.ico / favicon-32x32.png
const fav32 = encodePNG(32, 32, (x, y, w, h) => renderBorrowBuddyPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), fav32);
console.log('Generated favicon-32x32.png');

console.log('All icons generated successfully!');
