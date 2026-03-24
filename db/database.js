const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/kom_memorial.json';
let db;

function getDb() {
  if (!db) {
    const adapter = new FileSync(path.resolve(DB_PATH));
    db = low(adapter);
    db.defaults({ users: [], koms: [] }).write();
  }
  return db;
}

function initDb() {
  getDb();
  console.log('   Database initialised.');
}

// ── User helpers ──────────────────────────────────────
function findUserByEmail(email) {
  return getDb().get('users').find({ email }).value();
}

function findUserById(id) {
  return getDb().get('users').find({ id }).value();
}

function createUser({ email, username, password_hash }) {
  const user = {
    id: uuidv4(),
    email,
    username,
    password_hash,
    created_at: new Date().toISOString(),
  };
  getDb().get('users').push(user).write();
  return user;
}

// ── KOM helpers ───────────────────────────────────────
function findKomByIdAndUser(id, userId) {
  return getDb().get('koms').find({ id, user_id: userId }).value();
}

function getUserKoms(userId, status) {
  let chain = getDb().get('koms').filter({ user_id: userId });
  if (status) chain = chain.filter({ status });
  return chain.sortBy('got_date').reverse().value();
}

function createKom({ user_id, segment_name, got_date, strava_link, notes }) {
  const kom = {
    id: uuidv4(),
    user_id,
    segment_name,
    got_date,
    strava_link: strava_link || null,
    notes: notes || null,
    status: 'active',
    lost_date: null,
    new_holder: null,
    obituary: null,
    image_path: null,
    created_at: new Date().toISOString(),
  };
  getDb().get('koms').push(kom).write();
  return kom;
}

function updateKom(id, updates) {
  getDb().get('koms').find({ id }).assign(updates).write();
}

function deleteKom(id) {
  getDb().get('koms').remove({ id }).write();
}

module.exports = {
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
