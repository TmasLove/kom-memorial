/**
 * KOM Memorial, the no-account version.
 * The form drafts an obituary from a template, the card is drawn on a canvas,
 * and the visitor downloads or shares the PNG. Nothing leaves the browser;
 * the draft is kept in this browser only so a refresh doesn't lose it.
 */
(function () {
  'use strict';

  var TEMPLATES = [
    function (v) {
      return 'Here lies the KOM on ' + v.segmentName + ', held with iron legs and zero mercy by ' + v.username + '. ' +
        'From ' + fmtDate(v.gotDate) + ' to ' + fmtDate(v.lostDate) + ' — ' + v.daysHeld + ' glorious days — this segment ' +
        'trembled at the sound of their tyres. Then ' + (v.newHolder || 'a mystery rider') + ' showed up, ' +
        'presumably on a closed road with a tailwind and fresh legs from a two-week holiday. ' +
        'Gone, but not forgotten. The Strava crown lives on in our hearts.';
    },
    function (v) {
      return 'After ' + v.daysHeld + ' days of unopposed dominance, the reign of ' + v.username + ' over ' +
        v.segmentName + ' has officially ended. ' + (v.newHolder || 'Some anonymous cyclist') + ' apparently ' +
        'decided that ' + v.username + "'s suffering wasn't enough, and went and did it faster. " +
        'Born: ' + fmtDate(v.gotDate) + '. Died: ' + fmtDate(v.lostDate) + ". Cause of death: someone else's lunch ride.";
    },
    function (v) {
      return 'IN LOVING MEMORY of ' + v.username + "'s KOM on " + v.segmentName + '. ' +
        'It stood proudly from ' + fmtDate(v.gotDate) + ' until ' + fmtDate(v.lostDate) + ', ' +
        'a total of ' + v.daysHeld + ' days — each one a testament to human suffering and overpriced carbon fibre. ' +
        (v.newHolder || 'The new holder') + ' has taken the crown. We wish them well. ' +
        "We also hope they get a flat tyre on their next ride. (We don't mean that.) " +
        '(We absolutely mean that.)';
    },
    function (v) {
      return 'The KOM gods giveth, and the KOM gods taketh away. For ' + v.daysHeld + ' days, ' +
        v.username + ' ruled ' + v.segmentName + ' like a climbing monarch. ' +
        (v.newHolder || 'Another rider') + ' came along on ' + fmtDate(v.lostDate) + ' and ruined everything. ' +
        'They will not be forgiven. The segment will be avenged. But probably not today — ' +
        v.username + "'s legs are a bit tired.";
    },
    function (v) {
      return 'R.I.P. ' + v.username + "'s " + v.segmentName + ' KOM (' + fmtDate(v.gotDate) + ' – ' + fmtDate(v.lostDate) + '). ' +
        'Age: ' + v.daysHeld + ' days. Survived by: a bitter Strava notification, ' +
        'one very expensive power meter, and a diet that was definitely worth it. ' +
        (v.newHolder ? 'Usurped by ' + v.newHolder + ', who will themselves be usurped in due course.' : 'The new holder is currently unknown. The suspense is killing us.') + ' ' +
        'Donations in lieu of flowers can be made to buying a lighter wheelset.';
    },
  ];

  var EXAMPLE = {
    rider: 'Tommy Roldan',
    segment: 'Rickenbacker Causeway Climb',
    got: '2025-03-02',
    lost: '2025-09-14',
    holder: 'a guy on a TT bike',
  };

  var STORE = 'kom-memorial:draft';
  var DAY = 86400000;

  var $ = function (id) { return document.getElementById(id); };
  var f = {
    rider: $('rider'), segment: $('segment'), got: $('got'), lost: $('lost'),
    holder: $('holder'), obit: $('obit'),
  };
  var canvas = $('card');
  var state = { tpl: Math.floor(Math.random() * TEMPLATES.length), edited: false, size: 'post' };
  var renderTimer = null;

  function today() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function fmtDate(iso) {
    if (!iso) return '(unknown)';
    var d = new Date(iso + 'T12:00:00Z');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  function daysBetween(a, b) {
    if (!a || !b) return null;
    return Math.max(0, Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / DAY));
  }

  function pristine() {
    return !f.rider.value.trim() && !f.segment.value.trim() && !f.got.value && !f.holder.value.trim() && !state.edited;
  }

  // What the card and the draft are made from: the visitor's entries, or the example until they start.
  function values() {
    var ex = pristine();
    var v = {
      username: ex ? EXAMPLE.rider : (f.rider.value.trim() || 'Anonymous'),
      segmentName: ex ? EXAMPLE.segment : (f.segment.value.trim() || 'Your segment'),
      gotDate: ex ? EXAMPLE.got : f.got.value,
      lostDate: ex ? EXAMPLE.lost : (f.lost.value || today()),
      newHolder: ex ? EXAMPLE.holder : f.holder.value.trim(),
      example: ex,
    };
    v.daysHeld = daysBetween(v.gotDate, v.lostDate);
    return v;
  }

  function draft(v) {
    var t = TEMPLATES[state.tpl % TEMPLATES.length];
    return t({
      username: v.username, segmentName: v.segmentName, gotDate: v.gotDate, lostDate: v.lostDate,
      newHolder: v.newHolder, daysHeld: v.daysHeld == null ? '?' : v.daysHeld,
    });
  }

  function check() {
    var err = '';
    if (f.got.value && f.lost.value && f.lost.value < f.got.value) err = "The day you lost it can't be before the day you got it.";
    else if (f.lost.value && f.lost.value > today()) err = "The day you lost it can't be in the future. Not yet, anyway.";
    else if (f.got.value && f.got.value > today()) err = "The day you got it can't be in the future.";
    $('form-err').textContent = err;
    return !err;
  }

  function ready() {
    return !pristine() && f.segment.value.trim() && f.got.value && f.lost.value && check();
  }

  function render() {
    var v = values();
    if (!state.edited) f.obit.value = draft(v);
    KOMCard.draw(canvas, {
      segmentName: v.segmentName, gotDate: v.gotDate, lostDate: v.lostDate, daysHeld: v.daysHeld,
      newHolder: v.newHolder, obituary: f.obit.value.trim(),
    }, state.size);
    canvas.setAttribute('aria-label', 'Memorial card: R.I.P. KOM, ' + v.segmentName + (v.daysHeld == null ? '' : ', held for ' + v.daysHeld + ' days'));
    $('preview').classList.toggle('is-story', state.size === 'story');
    $('example-tag').hidden = !v.example;
    var ok = ready();
    $('download').disabled = !ok;
    $('share').disabled = !ok;
    $('need').hidden = ok;
    save();
  }

  function soon() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 40);
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        rider: f.rider.value, segment: f.segment.value, got: f.got.value, lost: f.lost.value,
        holder: f.holder.value, obit: state.edited ? f.obit.value : '', tpl: state.tpl, size: state.size,
      }));
    } catch (e) { /* private mode or storage blocked: the page still works */ }
  }

  function restore() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { s = null; }
    if (!s) return;
    ['rider', 'segment', 'got', 'lost', 'holder'].forEach(function (k) { if (typeof s[k] === 'string') f[k].value = s[k]; });
    if (typeof s.tpl === 'number') state.tpl = s.tpl;
    if (s.size === 'story' || s.size === 'post') state.size = s.size;
    if (s.obit) { f.obit.value = s.obit; state.edited = true; }
  }

  function fileName() {
    var slug = f.segment.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'segment';
    return 'rip-kom-' + slug + (state.size === 'story' ? '-story' : '') + '.png';
  }

  function toBlob() {
    return new Promise(function (resolve, reject) {
      render();
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('Could not make the image.')); }, 'image/png');
    });
  }

  function download() {
    if (!ready()) return;
    toBlob().then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      status('Saved ' + a.download + '.');
    }).catch(function (e) { status(e.message); });
  }

  function share() {
    if (!ready()) return;
    toBlob().then(function (blob) {
      var file = new File([blob], fileName(), { type: 'image/png' });
      return navigator.share({ files: [file], title: 'R.I.P. KOM: ' + f.segment.value.trim() });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      status("Sharing isn't available here, so the card was downloaded instead.");
      download();
    });
  }

  function status(msg) {
    $('status').textContent = msg;
  }

  function setSize(size) {
    state.size = size;
    document.querySelectorAll('[data-size]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.size === size));
    });
    render();
  }

  // Wire up
  var t = today();
  f.got.max = t;
  f.lost.max = t;
  restore();
  if (!f.lost.value) f.lost.value = t;

  ['rider', 'segment', 'got', 'lost', 'holder'].forEach(function (k) {
    f[k].addEventListener('input', soon);
  });
  f.obit.addEventListener('input', function () { state.edited = true; soon(); });
  $('redraft').addEventListener('click', function () {
    state.tpl = (state.tpl + 1) % TEMPLATES.length;
    state.edited = false;
    render();
  });
  document.querySelectorAll('[data-size]').forEach(function (b) {
    b.addEventListener('click', function () { setSize(b.dataset.size); });
  });
  $('download').addEventListener('click', download);
  $('share').addEventListener('click', share);
  $('start-over').addEventListener('click', function () {
    ['rider', 'segment', 'got', 'holder'].forEach(function (k) { f[k].value = ''; });
    f.lost.value = today();
    state.edited = false;
    try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
    status('');
    render();
    f.rider.focus();
  });

  // Share only where the browser can share image files (mostly phones).
  try {
    var probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
    $('share').hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch (e) { $('share').hidden = true; }

  setSize(state.size);
  // Redraw once the web font is in, so the card's text is measured with Inter, not the fallback.
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 58px Inter'), document.fonts.load('700 32px Inter'),
      document.fonts.load('400 26px Inter'), document.fonts.load('italic 400 26px Inter'),
    ]).then(render, render);
  }
})();
