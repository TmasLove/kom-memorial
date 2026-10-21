/**
 * KOM Memorial card, drawn on a canvas in the visitor's browser.
 * Same look as the server-rendered PNG (polka dots, crown, red bands),
 * in two sizes: a square post and a 9:16 story. Nothing is uploaded.
 */
(function (root) {
  'use strict';

  var SITE = 'kom-memorial.pages.dev';
  var FONT = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

  var SIZES = {
    post:  { W: 1080, H: 1080, crown: 90,  rip: 38, name: 58, nameMin: 34, dates: 26, days: 32, holder: 22, obit: 26, obitMin: 18, foot: 20, pad: 60 },
    story: { W: 1080, H: 1920, crown: 130, rip: 50, name: 80, nameMin: 44, dates: 36, days: 46, holder: 30, obit: 36, obitMin: 24, foot: 24, pad: 90 },
    og:    { W: 1200, H: 630,  crown: 64,  rip: 28, name: 54, nameMin: 36, dates: 24, days: 30, holder: 20, obit: 0,  obitMin: 0,  foot: 18, pad: 36 },
  };

  function font(weight, size, italic) {
    return (italic ? 'italic ' : '') + weight + ' ' + size + 'px ' + FONT;
  }

  // Splits text into lines that fit maxWidth. Keeps the writer's own line breaks.
  function wrap(ctx, text, maxWidth) {
    var out = [];
    String(text).split(/\n+/).forEach(function (para) {
      var words = para.trim().split(/\s+/).filter(Boolean);
      var line = '';
      words.forEach(function (word) {
        var test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) out.push(line);
    });
    return out;
  }

  function polkaDots(ctx, W, H) {
    ctx.fillStyle = 'rgba(183, 28, 28, 0.12)';
    var spacing = 60, r = 8;
    for (var x = spacing / 2; x < W; x += spacing) {
      for (var y = spacing / 2; y < H; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function crown(ctx, cx, top, s) {
    ctx.save();
    ctx.translate(cx - s / 2, top);
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
    [[0.15, 0.55], [0.5, 0.45], [0.85, 0.55]].forEach(function (j) {
      ctx.beginPath();
      ctx.arc(j[0] * s, j[1] * s, s * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = '#B71C1C';
      ctx.fill();
      ctx.strokeStyle = '#FFA000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();
  }

  function fmtShort(iso) {
    if (!iso) return '?';
    var d = new Date(iso + 'T12:00:00Z');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  /**
   * d: { segmentName, gotDate, lostDate, daysHeld, newHolder, obituary }
   * size: 'post' | 'story' | 'og'
   */
  function draw(canvas, d, size) {
    var m = SIZES[size] || SIZES.post;
    var W = m.W, H = m.H;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, H);
    polkaDots(ctx, W, H);
    ctx.fillStyle = '#B71C1C';
    ctx.fillRect(0, 0, W, 12);
    ctx.fillRect(0, H - 12, W, 12);

    var innerW = W - m.pad * 2;
    var footH = m.foot + 56;

    // Segment name: shrink until it fits in three lines; past the floor, end the third line with an ellipsis.
    var nameSize = m.name, nameLines;
    for (;;) {
      ctx.font = font(800, nameSize);
      nameLines = wrap(ctx, (d.segmentName || 'Your segment').toUpperCase(), innerW);
      if (nameLines.length <= 3 || nameSize - 4 < m.nameMin) break;
      nameSize -= 4;
    }
    if (nameLines.length > 3) {
      var third = nameLines.slice(2).join(' ');
      while (third && ctx.measureText(third + '…').width > innerW) third = third.replace(/\s*\S+$/, '');
      nameLines = nameLines.slice(0, 2).concat(third + '…');
    }
    var nameLH = Math.round(nameSize * 1.14);

    var holder = d.newHolder ? 'Now held by: ' + d.newHolder : '';
    var days = d.daysHeld == null ? '' : 'Held for ' + d.daysHeld + ' day' + (d.daysHeld === 1 ? '' : 's');

    // Everything above the obituary, as a list of [height, gapAfter].
    var g = m.rip * 0.9;
    var head = m.crown * 0.75 + g * 1.2 + m.rip + g * 0.7 + nameLines.length * nameLH + g + 2 + g + m.dates * 1.2 + g * 0.5 + (days ? m.days * 1.2 : 0) + (holder ? g * 0.4 + m.holder * 1.3 : 0);

    // Obituary: largest size that fits the space left, then clip with an ellipsis.
    var obitLines = [], obitLH = 0, obitSize = m.obit;
    var obitGap = m.obit ? g * 1.4 : 0;
    var room = H - 12 - footH - m.pad * 1.2 - head - obitGap;
    if (m.obit && d.obituary) {
      for (; obitSize >= m.obitMin; obitSize -= 1) {
        ctx.font = font(400, obitSize, true);
        obitLines = wrap(ctx, d.obituary, innerW - 10);
        obitLH = Math.round(obitSize * 1.45);
        if (obitLines.length * obitLH <= room) break;
      }
      obitSize = Math.max(obitSize, m.obitMin);
      ctx.font = font(400, obitSize, true);
      var maxLines = Math.max(1, Math.floor(room / obitLH));
      if (obitLines.length > maxLines) {
        obitLines = obitLines.slice(0, maxLines);
        var last = obitLines[maxLines - 1];
        while (last && ctx.measureText(last + '…').width > innerW - 10) last = last.replace(/\s*\S+$/, '');
        obitLines[maxLines - 1] = last + '…';
      }
    }
    var block = head + (obitLines.length ? obitGap + obitLines.length * obitLH : 0);

    // Centre the block between the top band and the footer.
    var y = Math.max(12 + m.pad * 0.6, Math.round((H - footH - block) / 2));

    crown(ctx, W / 2, y, m.crown);
    y += m.crown * 0.75 + g * 1.2;

    ctx.fillStyle = '#C62828';
    ctx.font = font(700, m.rip);
    ctx.fillText('— R . I . P .  K O M —', W / 2, y);
    y += m.rip + g * 0.7;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(800, nameSize);
    nameLines.forEach(function (line) {
      ctx.fillText(line, W / 2, y);
      y += nameLH;
    });
    y += g;

    ctx.strokeStyle = '#B71C1C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.pad + 20, y);
    ctx.lineTo(W - m.pad - 20, y);
    ctx.stroke();
    y += 2 + g;

    ctx.fillStyle = '#CCCCCC';
    ctx.font = font(400, m.dates);
    ctx.fillText(fmtShort(d.gotDate) + '  →  ' + fmtShort(d.lostDate), W / 2, y);
    y += m.dates * 1.2 + g * 0.5;

    if (days) {
      ctx.fillStyle = '#FFD700';
      ctx.font = font(700, m.days);
      ctx.fillText(days, W / 2, y);
      y += m.days * 1.2;
    }

    if (holder) {
      y += g * 0.4;
      ctx.fillStyle = '#AAAAAA';
      ctx.font = font(400, m.holder, true);
      ctx.fillText(holder, W / 2, y);
      y += m.holder * 1.3;
    }

    if (obitLines.length) {
      y += obitGap;
      ctx.fillStyle = '#DDDDDD';
      ctx.font = font(400, obitSize, true);
      obitLines.forEach(function (line) {
        ctx.fillText(line, W / 2, y);
        y += obitLH;
      });
    }

    ctx.fillStyle = '#777777';
    ctx.font = font(400, m.foot);
    ctx.fillText('KOM Memorial  •  ' + SITE, W / 2, H - 12 - m.foot - 24);
    return canvas;
  }

  root.KOMCard = { draw: draw, SIZES: SIZES, FONT: FONT, SITE: SITE };
})(window);
