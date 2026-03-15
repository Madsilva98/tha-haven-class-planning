import express from 'express';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

const router = express.Router();
router.use(express.json({ limit: '10mb' }));

// POST /api/ai
router.post('/ai', async (req, res) => {
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set. See README.' });
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: req.body.max_tokens || 1000,
        ...(req.body.system ? { system: req.body.system } : {}),
        messages: req.body.messages,
      }),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
