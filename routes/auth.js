const express = require('express');
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../db/database');
const { redirectIfAuth } = require('../middleware/auth');

const router = express.Router();

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
  if (password !== confirmPassword) {
    return res.render('register', { title: 'Create Account', error: 'Passwords do not match.' });
  }
  if (password.length < 6) {
    return res.render('register', { title: 'Create Account', error: 'Password must be at least 6 characters.' });
  }

  const existing = findUserByEmail(email.toLowerCase().trim());
  if (existing) {
    return res.render('register', { title: 'Create Account', error: 'An account with that email already exists.' });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = createUser({ email: email.toLowerCase().trim(), username: username.trim(), password_hash: hash });

  req.session.user = { id: user.id, email: user.email, username: user.username };
  res.redirect('/dashboard');
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

  const user = findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    return res.render('login', { title: 'Sign In', error: 'Invalid email or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.render('login', { title: 'Sign In', error: 'Invalid email or password.' });
  }

  req.session.user = { id: user.id, email: user.email, username: user.username };
  const returnTo = req.session.returnTo || '/dashboard';
  delete req.session.returnTo;
  res.redirect(returnTo);
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
