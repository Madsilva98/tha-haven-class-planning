import express from 'express';
import { createClient } from '@supabase/supabase-js';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

// POST /api/admin/delete-user
// Deletes a user from auth.users (requires service role key).
// Only callable by super_admin / backoffice_admin — verified via the caller's JWT.
router.post('/admin/delete-user', async (req, res) => {
  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set in .env' });
  }
  const authHeader = req.headers.authorization || '';
  const callerToken = authHeader.replace('Bearer ', '');
  if (!callerToken) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify the caller's role
    const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(callerToken);
    if (authErr || !caller) return res.status(401).json({ error: 'Invalid token' });

    const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (!['super_admin', 'backoffice_admin'].includes(callerProfile?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
