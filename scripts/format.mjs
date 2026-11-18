#!/usr/bin/env node
// Rewrites every JSON file in one consistent shape: two space indent, keys of
// locale files in the order of their source file, plural forms in CLDR order.
// Keeps diffs small no matter which editor or tool touched a file.
//
//   npm run format              rewrite files
//   npm run format -- --check   only report files that are not formatted (for CI)
//   npm run format -- --prune   also drop translations whose key left the source

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ROOT,
  localeFile,
  localeFolders,
  orderLike,
  orderPlural,
  parseArgs,
  readJson,
  relative,
  sourceFile,
  stringifyJson,
  writeText,
} from './lib.mjs';

const { options } = parseArgs();
const unformatted = [];

function apply(file, value) {
  const text = stringifyJson(value);
  if (readFileSync(file, 'utf8') === text) return;
  unformatted.push(relative(file));
  if (!options.check) writeText(file, text);
}

for (const name of ['languages.json', 'projects.json', 'glossary.json']) {
  const file = join(ROOT, name);
  if (existsSync(file)) apply(file, readJson(file));
}

const sources = new Map();
for (const file of readdirSync(join(ROOT, 'source')).filter((f) => f.endsWith('.json'))) {
  const path = join(ROOT, 'source', file);
  const source = readJson(path);
  for (const entry of Object.values(source)) {
    if (entry && typeof entry === 'object') entry.text = orderPlural(entry.text);
  }
  sources.set(file.slice(0, -5), source);
  apply(path, source);
}

for (const lang of localeFolders()) {
  for (const file of readdirSync(join(ROOT, 'locales', lang)).filter((f) => f.endsWith('.json'))) {
    const project = file.slice(0, -5);
    const source = sources.get(project) ?? (existsSync(sourceFile(project)) ? readJson(sourceFile(project)) : {});
    const path = localeFile(lang, project);
    apply(path, orderLike(source, readJson(path), { prune: !!options.prune }));
  }
}

if (options.check) {
  if (unformatted.length) {
    console.log(`Not formatted (run npm run format):\n  ${unformatted.join('\n  ')}`);
    process.exit(1);
  }
  console.log('All files are formatted.');
} else {
  console.log(unformatted.length ? `Formatted:\n  ${unformatted.join('\n  ')}` : 'All files were already formatted.');
}
