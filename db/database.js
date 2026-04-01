const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT        PRIMARY KEY,
      email        TEXT        UNIQUE NOT NULL,
      username     TEXT        NOT NULL,
      password_hash TEXT       NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS koms (
      id           TEXT        PRIMARY KEY,
      user_id      TEXT        NOT NULL,
      segment_name TEXT        NOT NULL,
      got_date     TEXT        NOT NULL,
      strava_link  TEXT,
      notes        TEXT,
      status       TEXT        NOT NULL DEFAULT 'active',
      lost_date    TEXT,
      new_holder   TEXT,
      obituary     TEXT,
      image_path   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('   Database initialised.');
}

// ── User helpers ──────────────────────────────────────
async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createUser({ email, username, password_hash }) {
  const id = uuidv4();
  const { rows } = await pool.query(
    'INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
    [id, email, username, password_hash]
  );
  return rows[0];
}

// ── KOM helpers ───────────────────────────────────────
async function findKomByIdAndUser(id, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM koms WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0] || null;
}

async function getUserKoms(userId, status) {
  if (status) {
    const { rows } = await pool.query(
      'SELECT * FROM koms WHERE user_id = $1 AND status = $2 ORDER BY got_date DESC',
      [userId, status]
    );
    return rows;
  }
  const { rows } = await pool.query(
    'SELECT * FROM koms WHERE user_id = $1 ORDER BY got_date DESC',
    [userId]
  );
  return rows;
}

async function createKom({ user_id, segment_name, got_date, strava_link, notes }) {
  const id = uuidv4();
  const { rows } = await pool.query(
    `INSERT INTO koms (id, user_id, segment_name, got_date, strava_link, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, user_id, segment_name, got_date, strava_link || null, notes || null]
  );
  return rows[0];
}

async function updateKom(id, updates) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `"${f}" = $${i + 2}`).join(', ');
  await pool.query(`UPDATE koms SET ${setClause} WHERE id = $1`, [id, ...values]);
}

async function deleteKom(id) {
  await pool.query('DELETE FROM koms WHERE id = $1', [id]);
}

module.exports = {
  pool,
  initDb,
  findUserByEmail,
  findUserById,
  createUser,
  findKomByIdAndUser,
  getUserKoms,
  createKom,
  updateKom,
  deleteKom,
};
