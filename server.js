const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      safe_name TEXT UNIQUE NOT NULL,
      picks JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);
  const { rows } = await pool.query('SELECT id FROM results WHERE id = 1');
  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO results (id, data) VALUES (1, $1)',
      [JSON.stringify({ round32: {}, round16: {}, quarters: {}, semis: {}, final: {}, champion: null })]
    );
  }
}

app.get('/api/teams', (req, res) => {
  const teams = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'teams.json'), 'utf8'));
  res.json(teams);
});

app.get('/api/results', async (req, res) => {
  const { rows } = await pool.query('SELECT data FROM results WHERE id = 1');
  res.json(rows[0]?.data || {});
});

app.post('/api/results', async (req, res) => {
  const { password, results } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Wrong password' });
  await pool.query('UPDATE results SET data = $1 WHERE id = 1', [JSON.stringify(results)]);
  res.json({ ok: true });
});

app.get('/api/predictions', async (req, res) => {
  const { rows } = await pool.query('SELECT name, safe_name, picks, created_at FROM predictions ORDER BY created_at');
  const predictions = rows.map(r => ({
    name: r.name,
    safeName: r.safe_name,
    picks: r.picks,
    createdAt: r.created_at
  }));
  res.json(predictions);
});

app.get('/api/predictions/:name', async (req, res) => {
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
  const { rows } = await pool.query('SELECT name, safe_name, picks, created_at FROM predictions WHERE safe_name = $1', [safeName]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ name: rows[0].name, safeName: rows[0].safe_name, picks: rows[0].picks, createdAt: rows[0].created_at });
});

app.post('/api/predictions', async (req, res) => {
  const { name, picks } = req.body;
  if (!name || !picks) return res.status(400).json({ error: 'Name and picks required' });
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  if (!safeName) return res.status(400).json({ error: 'Invalid name' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO predictions (name, safe_name, picks) VALUES ($1, $2, $3) RETURNING *',
      [name, safeName, JSON.stringify(picks)]
    );
    res.json({ name: rows[0].name, safeName: rows[0].safe_name, picks: rows[0].picks, createdAt: rows[0].created_at });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Name already taken' });
    throw e;
  }
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`Bracket server running on http://localhost:${PORT}`);
});
