const express = require('express');
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../db/database');
const { redirectIfAuth } = require('../middleware/auth');

const router = express.Router();

// Only allow safe relative paths for post-login redirects
function isSafeReturnTo(url) {
  if (!url || typeof url !== 'string') return false;
  // Must start with / but not // (protocol-relative) and not contain protocol
  return /^\/(?!\/)/.test(url) && !url.includes(':');
}

// Landing page
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('index', { title: 'KOM Memorial – Honour Your Lost Segments' });
});

// Register
router.get('/register', redirectIfAuth, (req, res) => {
  res.render('register', { title: 'Create Account', error: null });
});

router.post('/register', redirectIfAuth, async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  if (!email || !username || !password) {
    return res.render('register', { title: 'Create Account', error: 'All fields are required.' });
  }
  if (email.length > 254 || username.length > 50) {
    return res.render('register', { title: 'Create Account', error: 'Input exceeds maximum length.' });
  }
  if (password !== confirmPassword) {
    return res.render('register', { title: 'Create Account', error: 'Passwords do not match.' });
  }
  if (password.length < 8) {
    return res.render('register', { title: 'Create Account', error: 'Password must be at least 8 characters.' });
  }
  if (password.length > 128) {
    return res.render('register', { title: 'Create Account', error: 'Password is too long.' });
  }

  const existing = await findUserByEmail(email.toLowerCase().trim());
  if (existing) {
    return res.render('register', { title: 'Create Account', error: 'An account with that email already exists.' });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await createUser({ email: email.toLowerCase().trim(), username: username.trim(), password_hash: hash });

  // Regenerate session to prevent fixation
  req.session.regenerate((err) => {
    if (err) return res.redirect('/register');
    req.session.user = { id: user.id, email: user.email, username: user.username };
    res.redirect('/dashboard');
  });
});

// Login
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', { title: 'Sign In', error: null });
});

router.post('/login', redirectIfAuth, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { title: 'Sign In', error: 'Email and password are required.' });
  }
  if (email.length > 254 || password.length > 128) {
    return res.render('login', { title: 'Sign In', error: 'Invalid email or password.' });
  }

  const user = await findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    return res.render('login', { title: 'Sign In', error: 'Invalid email or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.render('login', { title: 'Sign In', error: 'Invalid email or password.' });
  }

  const returnTo = isSafeReturnTo(req.session.returnTo) ? req.session.returnTo : '/dashboard';

  // Regenerate session to prevent fixation
  req.session.regenerate((err) => {
    if (err) return res.redirect('/login');
    req.session.user = { id: user.id, email: user.email, username: user.username };
    res.redirect(returnTo);
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
