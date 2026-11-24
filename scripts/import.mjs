#!/usr/bin/env node
// Reads the English strings from local checkouts of the apps and updates
// source/<project>.json: new keys are added (with an empty context to fill
// in), changed English text is updated, keys the app dropped are removed.
//
//   npm run import -- --web ../web-app --ios ../iOS-app --android ../android-app --macos ../macos-app
//   npm run import -- --android ../android-app --drop-outdated
//
// --drop-outdated also deletes translations whose English text changed, so
// they show up as untranslated instead of silently keeping the old meaning.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  appNames,
  loadLanguages,
  loadLocale,
  loadProjects,
  localeFile,
  loadSource,
  orderPlural,
  outputPath,
  parseAndroidStrings,
  parseArgs,
  sourceFile,
  writeJson,
} from './lib.mjs';

const { options } = parseArgs();
const apps = appNames().filter((app) => typeof options[app] === 'string');
if (!apps.length) {
  console.log(`Usage: npm run import -- ${appNames().map((app) => `[--${app} <dir>]`).join(' ')} [--drop-outdated]`);
  process.exit(2);
}

const { source: sourceLang, all: languages } = loadLanguages();
const sourceLanguage = languages.find((language) => language.code === sourceLang);

for (const app of apps) {
  const dir = resolve(options[app]);
  for (const project of loadProjects().filter((p) => p.app === app)) {
    const file = join(dir, outputPath(project, sourceLanguage));
    if (!existsSync(file)) {
      console.log(`${project.id}: ${file} not found, skipped`);
      continue;
    }
    const english = readEnglish(project, readFileSync(file, 'utf8'));
    update(project, english.strings, english.comments, english.ordered);
  }
}

/** English text (and developer comments) of an app, in the app's own order. */
function readEnglish(project, content) {
  if (project.format === 'web-json') return { strings: JSON.parse(content), comments: {}, ordered: true };
  if (project.format === 'android-xml') return { strings: parseAndroidStrings(content), comments: {}, ordered: true };
  const catalog = JSON.parse(content);
  const strings = {};
  const comments = {};
  for (const [key, entry] of Object.entries(catalog.strings ?? {})) {
    if (entry.shouldTranslate === false || entry.extractionState === 'stale') continue;
    const english = entry.localizations?.[sourceLang];
    if (english?.variations?.plural) {
      strings[key] = Object.fromEntries(
        Object.entries(english.variations.plural).map(([category, form]) => [category, form.stringUnit?.value ?? key]),
      );
    } else {
      strings[key] = english?.stringUnit?.value ?? key;
    }
    if (entry.comment) comments[key] = entry.comment;
  }
  // A catalog is sorted alphabetically; keep the curated order of the source file.
  return { strings, comments, ordered: false };
}

function update(project, strings, comments, ordered) {
  const current = loadSource(project.id) ?? {};
  const next = {};
  const added = [];
  const changed = [];
  const removed = Object.keys(current).filter((key) => !(key in strings));
  const keys = ordered ? Object.keys(strings) : [...Object.keys(current).filter((key) => key in strings), ...Object.keys(strings).filter((key) => !(key in current))];
  for (const key of keys) {
    const text = orderPlural(strings[key]);
    const before = current[key];
    if (!before) {
      added.push(key);
      next[key] = { text, context: comments[key] ?? '' };
      continue;
    }
    const entry = { ...before, text };
    if (!entry.context && comments[key]) entry.context = comments[key];
    if (JSON.stringify(before.text) !== JSON.stringify(text)) changed.push(key);
    next[key] = entry;
  }
  writeJson(sourceFile(project.id), next);

  if (changed.length && options['drop-outdated']) {
    for (const language of languages) {
      if (language.code === sourceLang) continue;
      const locale = loadLocale(language.code, project.id);
      let dropped = false;
      for (const key of changed) {
        if (key in locale) {
          delete locale[key];
          dropped = true;
        }
      }
      if (dropped) writeJson(localeFile(language.code, project.id), locale);
    }
  }

  console.log(`${project.id}: ${Object.keys(next).length} strings, ${added.length} added, ${changed.length} changed, ${removed.length} removed`);
  const list = (label, keys) => keys.length && console.log(`  ${label}:\n    ${keys.slice(0, 30).join('\n    ')}${keys.length > 30 ? `\n    … ${keys.length - 30} more` : ''}`);
  list('added (write a context for each)', added);
  list(options['drop-outdated'] ? 'changed (old translations dropped)' : 'changed (check the translations)', changed);
  list('removed', removed);
}
