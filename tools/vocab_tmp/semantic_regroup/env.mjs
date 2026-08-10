import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const raw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of raw.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
export const SUPABASE_URL = env.SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('missing supabase env vars');
