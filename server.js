const express = require('express');
const cors = require('cors');

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const apiKey = process.env.API_KEY || 'YOUR_API_KEY';

const labState = {
  node: 'ran_ric',
  status: {
    core: 'unknown',
    ocudu: 'unknown',
    ric: 'unknown',
  },
  lastUpdated: null,
};

app.use(cors());
app.use(express.json({ limit: '32kb' }));

function requireApiKey(req, res, next) {
  const authHeader = req.get('Authorization') || '';
  const expectedHeader = `Bearer ${apiKey}`;

  if (authHeader !== expectedHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

app.post('/update-status', requireApiKey, (req, res) => {
  const incoming = req.body;

  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const nextStatus = incoming.status;
  if (!nextStatus || typeof nextStatus !== 'object' || Array.isArray(nextStatus)) {
    return res.status(400).json({ error: 'Invalid payload.status' });
  }

  labState.node = typeof incoming.node === 'string' ? incoming.node : labState.node;
  labState.status = {
    ...labState.status,
    ...nextStatus,
  };
  labState.lastUpdated = new Date().toISOString();

  return res.status(200).json({ ok: true });
});

app.get('/network-status', (req, res) => {
  return res.json(labState);
});

app.listen(port, () => {
  console.log(`5G lab status API listening on port ${port}`);
});
