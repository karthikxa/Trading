const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Read DATABASE_URL from .env or apps/api/.env without printing it
function getDbUrls() {
  const envPaths = [
    path.join(__dirname, '../apps/api/.env.prod'),
    path.join(__dirname, '../apps/api/.env.staging'),
    path.join(__dirname, '../apps/api/.env.local'),
    path.join(__dirname, '../apps/api/.env'),
    path.join(__dirname, '../apps/web/.env.local'),
    path.join(__dirname, '../.env')
  ];
  const list = [];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          let val = trimmed.slice('DATABASE_URL='.length).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val && !val.includes('localhost') && !val.includes('127.0.0.1')) {
            list.push({ file: path.basename(p), url: val });
          }
        }
      }
    }
  }
  return list;
}

async function main() {
  const targets = getDbUrls();
  if (targets.length === 0) {
    console.log('No non-local DATABASE_URL found in environment files.');
    return;
  }
  for (const t of targets) {
    console.log(`Checking connection from ${t.file}...`);
    const client = new Client({
      connectionString: t.url,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'trading' 
        ORDER BY table_name;
      `);
      console.log('--- SCHEMA TRADING TABLES (Total: ' + res.rows.length + ') ---');
      res.rows.forEach(r => console.log(' - ' + r.table_name));
      await client.end();
      break;
    } catch (err) {
      console.error('Connection to DB failed:', err.message);
      try { await client.end(); } catch {}
    }
  }
}

main();
