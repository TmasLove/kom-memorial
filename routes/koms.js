const express = require('express');
const path = require('path');
const { findKomByIdAndUser, createKom, updateKom, deleteKom } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { generateObituary } = require('../utils/obituary');
const { generateMemorialImage } = require('../utils/imageGen');

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = '2000-01-01';
const MAX_DATE = () => new Date().toISOString().split('T')[0];

function isValidDate(str) {
  if (!DATE_RE.test(str)) return false;
  if (str < MIN_DATE || str > MAX_DATE()) return false;
  const d = new Date(str + 'T12:00:00Z');
  return !isNaN(d.getTime());
}

function isSafeStravaLink(url) {
  if (!url) return true; // optional field
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') &&
      (u.hostname === 'www.strava.com' || u.hostname === 'strava.com');
  } catch {
    return false;
  }
}

// JSON endpoint: fresh draft obituary for the client-side regenerate button
router.get('/draft-obituary', requireAuth, (req, res) => {
  const { segmentName, gotDate, lostDate, newHolder } = req.query;
  if (!segmentName || !gotDate || !lostDate) {
    return res.status(400).json({ error: 'Missing required query params.' });
  }
  if (!isValidDate(gotDate) || !isValidDate(lostDate)) {
    return res.status(400).json({ error: 'Invalid date format.' });
  }
  // segmentName comes URL-encoded from the query string — express already decodes it once
  const obituary = generateObituary({
    username: req.session.user.username,
    segmentName,
    gotDate,
    lostDate,
    newHolder: newHolder || '',
  });
  res.json({ obituary });
});

// Add KOM form
router.get('/add', requireAuth, (req, res) => {
  res.render('add-kom', { title: 'Add a KOM', error: null });
});

router.post('/add', requireAuth, (req, res) => {
  const { segment_name, got_date, strava_link, notes } = req.body;

  if (!segment_name || !got_date) {
    return res.render('add-kom', { title: 'Add a KOM', error: 'Segment name and date are required.' });
  }
  if (segment_name.length > 200) {
    return res.render('add-kom', { title: 'Add a KOM', error: 'Segment name is too long (max 200 characters).' });
  }
  if (!isValidDate(got_date)) {
    return res.render('add-kom', { title: 'Add a KOM', error: 'Invalid date format or date out of range.' });
  }
  if (strava_link && !isSafeStravaLink(strava_link)) {
    return res.render('add-kom', { title: 'Add a KOM', error: 'Strava link must be a valid strava.com URL.' });
  }
  if (notes && notes.length > 1000) {
    return res.render('add-kom', { title: 'Add a KOM', error: 'Notes are too long (max 1000 characters).' });
  }

  createKom({
    user_id: req.session.user.id,
    segment_name: segment_name.trim(),
    got_date,
    strava_link: strava_link || null,
    notes: notes || null,
  });

  res.redirect('/dashboard');
});

// Memorialize form
router.get('/:id/memorialize', requireAuth, (req, res) => {
  const kom = findKomByIdAndUser(req.params.id, req.session.user.id);

  if (!kom || kom.status === 'memorialized') {
    return res.redirect('/dashboard');
  }

  const today = new Date().toISOString().split('T')[0];
  const draft = generateObituary({
    username: req.session.user.username,
    segmentName: kom.segment_name,
    gotDate: kom.got_date,
    lostDate: today,
    newHolder: '',
  });

  res.render('memorialize', {
    title: `Memorialize: ${kom.segment_name}`,
    kom,
    draftObituary: draft,
    error: null,
  });
});

router.post('/:id/memorialize', requireAuth, async (req, res) => {
  const { lost_date, new_holder, obituary } = req.body;
  const kom = findKomByIdAndUser(req.params.id, req.session.user.id);

  if (!kom || kom.status === 'memorialized') {
    return res.redirect('/dashboard');
  }

  const renderMemorialize = (error) => {
    const draft = generateObituary({
      username: req.session.user.username,
      segmentName: kom.segment_name,
      gotDate: kom.got_date,
      lostDate: lost_date || new Date().toISOString().split('T')[0],
      newHolder: new_holder || '',
    });
    return res.render('memorialize', {
      title: `Memorialize: ${kom.segment_name}`,
      kom,
      draftObituary: draft,
      error,
    });
  };

  if (!lost_date || !obituary) {
    return renderMemorialize('Date lost and obituary are required.');
  }
  if (!isValidDate(lost_date)) {
    return renderMemorialize('Invalid date format or date out of range.');
  }
  if (lost_date < kom.got_date) {
    return renderMemorialize('Lost date cannot be before the date you got the KOM.');
  }
  if (new_holder && new_holder.length > 100) {
    return renderMemorialize('New holder name is too long (max 100 characters).');
  }
  if (obituary.length > 2000) {
    return renderMemorialize('Obituary is too long (max 2000 characters).');
  }

  const got = new Date(kom.got_date + 'T12:00:00Z');
  const lost = new Date(lost_date + 'T12:00:00Z');
  const daysHeld = Math.max(0, Math.round((lost - got) / (1000 * 60 * 60 * 24)));

  // Generate memorial image (non-blocking failure)
  let imagePath = null;
  try {
    imagePath = await generateMemorialImage({
      komId: kom.id,
      username: req.session.user.username,
      segmentName: kom.segment_name,
      gotDate: kom.got_date,
      lostDate: lost_date,
      daysHeld,
      newHolder: new_holder || 'an unknown challenger',
      obituary,
    });
  } catch (err) {
    console.warn('Image generation failed (non-fatal):', err.message);
  }

  updateKom(kom.id, {
    status: 'memorialized',
    lost_date,
    new_holder: new_holder || null,
    obituary,
    image_path: imagePath,
  });

  res.redirect(`/koms/${kom.id}/memorial`);
});

// Memorial page
router.get('/:id/memorial', requireAuth, (req, res) => {
  const kom = findKomByIdAndUser(req.params.id, req.session.user.id);

  if (!kom || kom.status !== 'memorialized') {
    return res.redirect('/dashboard');
  }

  const got = new Date(kom.got_date + 'T12:00:00Z');
  const lost = new Date(kom.lost_date + 'T12:00:00Z');
  const daysHeld = Math.max(0, Math.round((lost - got) / (1000 * 60 * 60 * 24)));

  res.render('memorial', {
    title: `R.I.P. ${kom.segment_name}`,
    kom,
    daysHeld,
  });
});

// Download memorial image
router.get('/:id/image', requireAuth, (req, res) => {
  const kom = findKomByIdAndUser(req.params.id, req.session.user.id);

  if (!kom || !kom.image_path) {
    return res.status(404).send('Image not found.');
  }

  // Path containment: ensure the resolved path stays inside the generated images dir
  const generatedDir = path.resolve(__dirname, '..', 'public', 'images', 'generated');
  const absPath = path.resolve(__dirname, '..', 'public', kom.image_path);
  if (!absPath.startsWith(generatedDir + path.sep)) {
    return res.status(403).send('Forbidden.');
  }

  // Safe filename: strip everything except alphanumerics, hyphens, underscores, dots
  const safeFilename = `kom-memorial-${kom.segment_name.replace(/[^a-zA-Z0-9\-_]/g, '-')}.png`;
  res.download(absPath, safeFilename);
});

// Regenerate image
router.post('/:id/regenerate-image', requireAuth, async (req, res) => {
  const kom = findKomByIdAndUser(req.params.id, req.session.user.id);

  if (!kom || kom.status !== 'memorialized') {
    return res.redirect('/dashboard');
  }

  const got = new Date(kom.got_date + 'T12:00:00Z');
  const lost = new Date(kom.lost_date + 'T12:00:00Z');
  const daysHeld = Math.max(0, Math.round((lost - got) / (1000 * 60 * 60 * 24)));

  try {
    const imagePath = await generateMemorialImage({
      komId: kom.id,
      username: req.session.user.username,
      segmentName: kom.segment_name,
      gotDate: kom.got_date,
      lostDate: kom.lost_date,
      daysHeld,
      newHolder: kom.new_holder || 'an unknown challenger',
      obituary: kom.obituary,
    });
    updateKom(kom.id, { image_path: imagePath });
  } catch (err) {
    console.error('Image regeneration failed:', err.message);
  }

  res.redirect(`/koms/${kom.id}/memorial`);
});

// Delete a KOM
router.post('/:id/delete', requireAuth, (req, res) => {
  const kom = findKomByIdAndUser(req.params.id, req.session.user.id);
  if (kom) deleteKom(kom.id);
  res.redirect('/dashboard');
});

module.exports = router;
