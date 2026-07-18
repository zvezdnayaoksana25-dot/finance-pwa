import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceRoots = ['src', 'public', 'e2e', 'tests'];
const allowedText = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.webmanifest', '.mjs']);
const files = [];

function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (allowedText.has(path.slice(path.lastIndexOf('.')))) files.push(path);
  }
}

for (const directory of sourceRoots) walk(join(root, directory));
const contents = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
const forbidden = /\b(TODO|FIXME|demo-mode|prototype-mode|fake API|mock API)\b/i;
const violations = contents.filter(({ path, text }) => forbidden.test(text));

if (violations.length) {
  console.error(`Release check failed: forbidden unfinished markers found in ${violations.map(({ path }) => relative(root, path)).join(', ')}`);
  process.exit(1);
}

if (process.argv.includes('--format')) {
  const whitespace = contents.filter(({ text }) => /[ \t]+\r?$/m.test(text) || !text.endsWith('\n'));
  if (whitespace.length) {
    console.error(`Format check failed: trailing whitespace or missing final newline in ${whitespace.map(({ path }) => relative(root, path)).join(', ')}`);
    process.exit(1);
  }
}

for (const required of ['dist/index.html', 'dist/manifest.webmanifest', 'dist/sw.js']) {
  if (!existsSync(join(root, required))) {
    console.error(`Release check failed: missing ${required}. Run npm run build first.`);
    process.exit(1);
  }
}

console.log(`Release check passed for ${contents.length} source files.`);
