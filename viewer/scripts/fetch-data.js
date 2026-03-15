#!/usr/bin/env node
/**
 * Fetches the timeline dataset from the editor API into public/dataset.json for static build.
 * The editor must be running at http://localhost:5001.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const outPath = path.join(publicDir, 'dataset.json');
const url = 'http://localhost:5001/api/export/dataset';

async function main() {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (!data?.metadata) {
      throw new Error('Response missing metadata');
    }
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(data), 'utf8');
    console.log(`Fetched ${url} -> ${outPath}`);
  } catch (err) {
    console.error('Failed to fetch dataset:', err.message);
    console.error('Start the editor first (cd editor && ./start-app.sh).');
    process.exit(1);
  }
}

main();
