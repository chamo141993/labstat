const express = require('express');
const cors = require('cors');

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const apiKey = (process.env.API_KEY || '').trim();
const corsOrigin = process.env.CORS_ORIGIN || '*';

if (!apiKey) {
  console.error('API_KEY environment variable is required');
  process.exit(1);
}

const VALID_NODES = new Set(['core', 'ran_ric']);
const VALID_STATUS_KEYS = new Set(['core', 'ocudu', 'ric', 'ue_count']);
const VALID_COMPONENT_STATUSES = new Set(['up', 'down', 'partial', 'unknown']);

const labState = {
  node: 'ran_ric',
  status: {
    core: 'unknown',
    ocudu: 'unknown',
    ric: 'unknown',
    ue_count: null,
  },
  lastUpdated: null,
};

app.disable('x-powered-by');
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '8kb', strict: true }));

function requireApiKey(req, res, next) {
  const authHeader = (req.get('Authorization') || '').trim();
  const expectedHeader = `Bearer ${apiKey}`;

  if (authHeader !== expectedHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function sanitizeStatus(status) {
  const sanitized = {};

  for (const [key, value] of Object.entries(status)) {
    if (!VALID_STATUS_KEYS.has(key)) {
      return { error: `Unknown status key: ${key}` };
    }

    if (key === 'ue_count') {
      if (value === null) {
        sanitized.ue_count = null;
        continue;
      }

      if (!Number.isInteger(value) || value < 0) {
        return { error: 'ue_count must be a non-negative integer or null' };
      }

      sanitized.ue_count = value;
      continue;
    }

    if (typeof value !== 'string' || !VALID_COMPONENT_STATUSES.has(value)) {
      return { error: `${key} must be one of: ${Array.from(VALID_COMPONENT_STATUSES).join(', ')}` };
    }

    sanitized[key] = value;
  }

  return { value: sanitized };
}

app.post('/update-status', requireApiKey, (req, res) => {
  const incoming = req.body;

  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  if (typeof incoming.node !== 'string' || !VALID_NODES.has(incoming.node)) {
    return res.status(400).json({ error: 'Invalid node' });
  }

  const nextStatus = incoming.status;
  if (!nextStatus || typeof nextStatus !== 'object' || Array.isArray(nextStatus)) {
    return res.status(400).json({ error: 'Invalid payload.status' });
  }

  const sanitizedStatus = sanitizeStatus(nextStatus);
  if (sanitizedStatus.error) {
    return res.status(400).json({ error: sanitizedStatus.error });
  }

  labState.node = incoming.node;
  labState.status = {
    ...labState.status,
    ...sanitizedStatus.value,
  };
  labState.lastUpdated = new Date().toISOString();

  return res.status(200).json({ ok: true });
});

app.get('/', (req, res) => {
  return res.json({
    service: 'labstat-backend',
    statusEndpoint: '/network-status',
    updateEndpoint: '/update-status',
  });
});

app.get('/network-status', (req, res) => {
  return res.json(labState);
});

app.listen(port, () => {
  console.log(`5G lab status API listening on port ${port}`);
});
