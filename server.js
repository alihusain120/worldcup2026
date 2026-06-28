const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const PREDICTIONS_DIR = path.join(DATA_DIR, 'predictions');

app.get('/api/teams', (req, res) => {
  const teams = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'teams.json'), 'utf8'));
  res.json(teams);
});

app.get('/api/results', (req, res) => {
  const results = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'results.json'), 'utf8'));
  res.json(results);
});

app.post('/api/results', (req, res) => {
  fs.writeFileSync(path.join(DATA_DIR, 'results.json'), JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.get('/api/predictions', (req, res) => {
  const files = fs.readdirSync(PREDICTIONS_DIR).filter(f => f.endsWith('.json'));
  const predictions = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(PREDICTIONS_DIR, f), 'utf8'));
    return data;
  });
  res.json(predictions);
});

app.get('/api/predictions/:name', (req, res) => {
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(PREDICTIONS_DIR, `${safeName}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.json(data);
});

app.post('/api/predictions', (req, res) => {
  const { name, picks } = req.body;
  if (!name || !picks) return res.status(400).json({ error: 'Name and picks required' });
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  if (!safeName) return res.status(400).json({ error: 'Invalid name' });
  const filePath = path.join(PREDICTIONS_DIR, `${safeName}.json`);
  if (fs.existsSync(filePath)) return res.status(409).json({ error: 'Name already taken' });
  const prediction = { name, safeName, picks, createdAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(prediction, null, 2));
  res.json(prediction);
});

app.listen(PORT, () => console.log(`Bracket server running on http://localhost:${PORT}`));
