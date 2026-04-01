const { put } = require('@vercel/blob');

/**
 * Wraps text to fit within a given pixel width.
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draws a polka-dot background (KOM jersey style).
 */
function drawPolkaDots(ctx, width, height) {
  ctx.fillStyle = 'rgba(183, 28, 28, 0.12)';
  const spacing = 60;
  const radius = 8;
  for (let x = spacing / 2; x < width; x += spacing) {
    for (let y = spacing / 2; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Draws a simple crown icon using canvas paths.
 */
function drawCrown(ctx, cx, cy, size) {
  const s = size;
  ctx.save();
  ctx.translate(cx - s / 2, cy - s / 2);

  // Crown body
  ctx.beginPath();
  ctx.moveTo(0, s * 0.75);
  ctx.lineTo(0, s * 0.35);
  ctx.lineTo(s * 0.25, s * 0.55);
  ctx.lineTo(s * 0.5, 0);
  ctx.lineTo(s * 0.75, s * 0.55);
  ctx.lineTo(s, s * 0.35);
  ctx.lineTo(s, s * 0.75);
  ctx.closePath();
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.strokeStyle = '#FFA000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Crown jewels (3 circles)
  const jewels = [
    { x: s * 0.15, y: s * 0.55 },
    { x: s * 0.5, y: s * 0.45 },
    { x: s * 0.85, y: s * 0.55 },
  ];
  for (const j of jewels) {
    ctx.beginPath();
    ctx.arc(j.x, j.y, s * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = '#B71C1C';
    ctx.fill();
    ctx.strokeStyle = '#FFA000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Generates a 1080×1080 memorial PNG, uploads to Vercel Blob, and returns the public URL.
 */
async function generateMemorialImage({
  komId,
  username,
  segmentName,
  gotDate,
  lostDate,
  daysHeld,
  newHolder,
  obituary,
}) {
  let createCanvas;
  try {
    ({ createCanvas } = require('@napi-rs/canvas'));
  } catch {
    throw new Error('@napi-rs/canvas is not installed. Run: npm install @napi-rs/canvas');
  }

  const W = 1080;
  const H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // --- Background ---
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, W, H);

  drawPolkaDots(ctx, W, H);

  // Top red band
  ctx.fillStyle = '#B71C1C';
  ctx.fillRect(0, 0, W, 12);

  // Bottom red band
  ctx.fillStyle = '#B71C1C';
  ctx.fillRect(0, H - 12, W, 12);

  // --- Crown ---
  drawCrown(ctx, W / 2, 110, 90);

  // --- R.I.P. KOM header ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#B71C1C';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('— R . I . P .  K O M —', W / 2, 230);

  // --- Segment name ---
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 58px sans-serif';
  const nameLines = wrapText(ctx, segmentName.toUpperCase(), W - 100);
  nameLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 300 + i * 66);
  });

  const afterName = 300 + nameLines.length * 66 + 20;

  // --- Divider ---
  ctx.strokeStyle = '#B71C1C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, afterName);
  ctx.lineTo(W - 80, afterName);
  ctx.stroke();

  // --- Dates & Days held ---
  const fmtD = (s) => {
    const d = new Date(s + 'T12:00:00Z');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  ctx.font = '26px sans-serif';
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`${fmtD(gotDate)}  →  ${fmtD(lostDate)}`, W / 2, afterName + 44);

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`Held for ${daysHeld} day${daysHeld !== 1 ? 's' : ''}`, W / 2, afterName + 90);

  if (newHolder && newHolder !== 'an unknown challenger') {
    ctx.font = 'italic 22px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Now held by: ${newHolder}`, W / 2, afterName + 128);
  }

  // --- Obituary ---
  const obitY = afterName + 180;
  ctx.font = 'italic 21px sans-serif';
  ctx.fillStyle = '#DDDDDD';

  const obitLines = wrapText(ctx, obituary, W - 130);
  const maxObitLines = Math.floor((H - 90 - obitY) / 30);
  obitLines.slice(0, maxObitLines).forEach((line, i) => {
    ctx.fillText(line, W / 2, obitY + i * 30);
  });

  // --- Branding footer ---
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('KOM Memorial  •  komemorial.app', W / 2, H - 30);

  // --- Upload to Vercel Blob ---
  const filename = `kom-${komId}-${Date.now()}.png`;
  const buffer = canvas.toBuffer('image/png');

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: 'image/png',
  });

  return blob.url;
}

module.exports = { generateMemorialImage };
