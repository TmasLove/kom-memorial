require('dotenv').config();

// Fail fast in production without a real secret
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET env var must be set in production.');
  process.exit(1);
}

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
const imagesDir = path.join(__dirname, 'public', 'images', 'generated');
for (const dir of [dataDir, imagesDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const { initDb } = require('./db/database');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const komRoutes = require('./routes/koms');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
    },
  },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts, please try again in 15 minutes.',
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session: MemoryStore for dev. In production, swap in Redis or similar:
//   store: new RedisStore({ client: redisClient })
app.use(session({
  secret: process.env.SESSION_SECRET || 'kom-memorial-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.appName = process.env.APP_NAME || 'KOM Memorial';
  next();
});

// Apply rate limiting to auth routes
app.use('/login', authLimiter);
app.use('/register', authLimiter);

// Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/koms', komRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
  });
});

initDb();
app.listen(PORT, () => {
  console.log(`\n🚴 KOM Memorial is running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
