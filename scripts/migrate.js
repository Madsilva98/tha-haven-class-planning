#!/usr/bin/env node
/**
 * One-time migration: local data/*.json → Supabase
 *
 * Usage:
 *   1. Set USER_EMAIL and USER_PASSWORD in .env (or as env vars below)
 *   2. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in .env
 *   3. Run: node scripts/migrate.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, '..', 'data');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

const USER_EMAIL    = process.env.MIGRATE_EMAIL;
const USER_PASSWORD = process.env.MIGRATE_PASSWORD;

if (!USER_EMAIL || !USER_PASSWORD) {
  console.error('Set MIGRATE_EMAIL and MIGRATE_PASSWORD in .env');
  process.exit(1);
}

const readJSON = file => {
  const path = join(DATA_DIR, `${file}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
};

const seriesToDB = (s, userId) => ({
  id: s.id, name: s.name, type: s.type, status: s.status || 'testing',
  song: s.song || null, intro_cue: s.introCue || null, open_cue: s.openCue || null,
  close_cue: s.closeCue || null, modifications: s.modifications || null,
  muscles: s.muscles || [], cues: s.cues || null,
  target_zone: s.targetZone || null, primary_zone: s.primaryZone || null,
  reformer: s.reformer || null, barre: s.barre || null,
  video_url: s.videoUrl || null, created_by: userId, visibility: 'personal',
  updated_at: new Date().toISOString(),
});

const classToDB = (c, userId) => ({
  id: c.id, name: c.name, type: c.type, date: c.date || null,
  series_order: c.seriesIds || [], notes: c.notes || null,
  created_by: userId, visibility: 'personal',
});

async function migrate() {
  console.log('Signing in…');
  const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
    email: USER_EMAIL, password: USER_PASSWORD,
  });
  if (signInError) { console.error('Sign-in failed:', signInError.message); process.exit(1); }
  console.log('Signed in as', user.email, '(id:', user.id, ')');

  // Ensure profile exists
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!profile) {
    await supabase.from('profiles').insert({ id: user.id, name: user.email });
    console.log('Created profile');
  }

  // Migrate series
  const series = readJSON('series');
  if (series && Array.isArray(series) && series.length) {
    console.log(`Migrating ${series.length} series…`);
    const rows = series.map(s => seriesToDB(s, user.id));
    const { error } = await supabase.from('series').upsert(rows, { onConflict: 'id' });
    if (error) console.error('Series error:', error.message);
    else console.log('  ✓ series done');
  }

  // Migrate classes
  const classes = readJSON('classes');
  if (classes && Array.isArray(classes) && classes.length) {
    console.log(`Migrating ${classes.length} classes…`);
    const rows = classes.map(c => classToDB(c, user.id));
    const { error } = await supabase.from('classes').upsert(rows, { onConflict: 'id' });
    if (error) console.error('Classes error:', error.message);
    else console.log('  ✓ classes done');
  }

  // Migrate AI style
  const aistyle = readJSON('aistyle');
  if (aistyle && typeof aistyle.value === 'string') {
    console.log('Migrating AI style…');
    const { error } = await supabase.from('ai_styles').upsert(
      { user_id: user.id, value: aistyle.value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) console.error('AI style error:', error.message);
    else console.log('  ✓ ai_style done');
  }

  // Migrate examples
  const examples = readJSON('examples');
  if (examples && Array.isArray(examples) && examples.length) {
    console.log(`Migrating ${examples.length} examples…`);
    const rows = examples.map(e => ({ ...e, user_id: user.id }));
    const { error } = await supabase.from('examples').upsert(rows, { onConflict: 'id' });
    if (error) console.error('Examples error:', error.message);
    else console.log('  ✓ examples done');
  }

  console.log('\nMigration complete.');
}

migrate().catch(console.error);
