#!/usr/bin/env node
// Checks every file in the repository: structure, keys, plural forms and
// placeholders. Exits with 1 when there are errors (or warnings with --strict).
//
//   npm run validate
//   npm run validate -- --strict
//   npm run validate -- --lang de --project web

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ROOT,
  activeProjects,
  comparePlaceholders,
  forms,
  isPlural,
  loadLanguages,
  loadLocale,
  loadProjects,
  localeFile,
  localeFolders,
  parseArgs,
  readJson,
  relative,
  sourceFile,
} from './lib.mjs';

const { options } = parseArgs();
const problems = [];
const report = (level, file, key, message) => problems.push({ level, file: relative(file), key, message });
const error = (...args) => report('error', ...args);
const warning = (...args) => report('warning', ...args);

// --- languages.json --------------------------------------------------------

const languagesFile = join(ROOT, 'languages.json');
const { source: sourceLang, all: languages } = loadLanguages();
const languageByCode = new Map();
const CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
for (const language of languages) {
  const where = language.code ?? '(language without code)';
  for (const field of ['code', 'name', 'nativeName', 'dir', 'plurals', 'platforms', 'status']) {
    if (language[field] === undefined) error(languagesFile, where, `missing "${field}"`);
  }
  if (languageByCode.has(language.code)) error(languagesFile, where, 'duplicate language code');
  languageByCode.set(language.code, language);
  if (!['ltr', 'rtl'].includes(language.dir)) error(languagesFile, where, '"dir" must be "ltr" or "rtl"');
  if (!Array.isArray(language.plurals) || !language.plurals.includes('other')) {
    error(languagesFile, where, '"plurals" must list the CLDR categories and include "other"');
  } else {
    for (const category of language.plurals) {
      if (!CATEGORIES.has(category)) error(languagesFile, where, `unknown plural category "${category}"`);
    }
    try {
      const cldr = new Intl.PluralRules(language.code).resolvedOptions().pluralCategories;
      const missing = cldr.filter((category) => !language.plurals.includes(category));
      if (missing.length) warning(languagesFile, where, `CLDR also uses the plural categories ${missing.join(', ')}`);
    } catch {
      // Older Node versions may not know every locale; nothing to compare with then.
    }
  }
  if (!['source', 'machine', 'review', 'reviewed'].includes(language.status)) {
    error(languagesFile, where, '"status" must be source, machine, review or reviewed');
  }
}
if (!languageByCode.has(sourceLang)) error(languagesFile, 'sourceLanguage', `"${sourceLang}" is not in the list`);

// --- projects.json ---------------------------------------------------------

const projectsFile = join(ROOT, 'projects.json');
const projects = loadProjects();
const projectIds = new Set();
for (const project of projects) {
  for (const field of ['id', 'name', 'app', 'format', 'path', 'placeholders']) {
    if (!project[field]) error(projectsFile, project.id ?? '(project)', `missing "${field}"`);
  }
  if (projectIds.has(project.id)) error(projectsFile, project.id, 'duplicate project id');
  projectIds.add(project.id);
  if (!['braces', 'apple', 'java'].includes(project.placeholders)) {
    error(projectsFile, project.id, '"placeholders" must be braces, apple or java');
  }
  if (!['web-json', 'xcstrings', 'android-xml'].includes(project.format)) {
    error(projectsFile, project.id, '"format" must be web-json, xcstrings or android-xml');
  }
}
for (const file of readdirSync(join(ROOT, 'source'))) {
  if (file.endsWith('.json') && !projectIds.has(file.slice(0, -5))) {
    error(join(ROOT, 'source', file), '', 'no project with this id in projects.json');
  }
}

// --- glossary.json ---------------------------------------------------------

const glossaryFile = join(ROOT, 'glossary.json');
const keepTerms = [];
if (existsSync(glossaryFile)) {
  const glossary = readJson(glossaryFile);
  for (const term of glossary.terms ?? []) {
    if (!term.term) error(glossaryFile, '', 'a term without "term"');
    if (term.doNotTranslate) {
      // A whole word in the English text ("Pro", but not "Profile"); in the
      // translation any occurrence counts, since CJK text has no spaces.
      const escaped = term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      keepTerms.push({ term: term.term, pattern: new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u') });
    }
    for (const code of Object.keys(term.translations ?? {})) {
      if (!languageByCode.has(code)) error(glossaryFile, term.term, `unknown language "${code}"`);
    }
  }
}

// --- source files ----------------------------------------------------------

const sourceCategories = new Set(languageByCode.get(sourceLang)?.plurals ?? ['one', 'other']);
const sources = new Map();
for (const project of activeProjects()) {
  if (options.project && options.project !== project.id) continue;
  const file = sourceFile(project.id);
  const source = readJson(file);
  sources.set(project.id, source);
  for (const [key, entry] of Object.entries(source)) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      error(file, key, 'an entry must be an object with "text" and "context"');
      continue;
    }
    for (const field of Object.keys(entry)) {
      if (!['text', 'context', 'placeholders', 'maxLength'].includes(field)) warning(file, key, `unknown field "${field}"`);
    }
    if (typeof entry.text === 'string') {
      if (entry.text.trim() === '') error(file, key, '"text" is empty');
    } else if (isPlural(entry.text)) {
      if (typeof entry.text.other !== 'string') error(file, key, 'a plural needs an "other" form');
      for (const [category, text] of Object.entries(entry.text)) {
        if (!sourceCategories.has(category)) error(file, key, `"${category}" is not a plural category of ${sourceLang}`);
        if (typeof text !== 'string' || text.trim() === '') error(file, key, `plural form "${category}" is empty`);
      }
    } else {
      error(file, key, '"text" must be a string or an object of plural forms');
      continue;
    }
    if (typeof entry.context !== 'string' || entry.context.trim() === '') {
      warning(file, key, 'no "context" for translators');
    }
    if (entry.maxLength !== undefined && !(Number.isInteger(entry.maxLength) && entry.maxLength > 0)) {
      error(file, key, '"maxLength" must be a positive whole number');
    }
    for (const [category, text] of forms(entry.text)) {
      const { mixed } = comparePlaceholders(text, text, project.placeholders);
      if (mixed) error(file, key, `numbered and unnumbered placeholders are mixed${category ? ` (${category})` : ''}`);
    }
    if (entry.placeholders) {
      const tokens = new Set(forms(entry.text).flatMap(([, text]) => placeholderTokens(text, project.placeholders)));
      for (const token of Object.keys(entry.placeholders)) {
        if (!tokens.has(token)) warning(file, key, `"placeholders" describes ${token}, which is not in the text`);
      }
    }
  }
}

function placeholderTokens(text, syntax) {
  if (syntax === 'braces') return [...text.matchAll(/\{[A-Za-z0-9_]+\}/g)].map((m) => m[0]);
  return [...text.matchAll(/%(?:\d+\$)?[-+#0']*(?:\d+)?(?:\.\d+)?(?:hh|h|ll|l|q|L|z|t|j)?[@a-zA-Z]/g)].map((m) => m[0]);
}

// --- locale files ----------------------------------------------------------

for (const folder of localeFolders()) {
  if (options.lang && options.lang !== folder) continue;
  const language = languageByCode.get(folder);
  if (!language) {
    error(join(ROOT, 'locales', folder), '', 'not a language code from languages.json');
    continue;
  }
  if (folder === sourceLang) {
    error(join(ROOT, 'locales', folder), '', `${sourceLang} is the source language; its text lives in source/`);
    continue;
  }
  const allowed = new Set(language.plurals);
  for (const file of readdirSync(join(ROOT, 'locales', folder))) {
    if (!file.endsWith('.json')) continue;
    const projectId = file.slice(0, -5);
    const path = localeFile(folder, projectId);
    if (options.project && options.project !== projectId) continue;
    const project = projects.find((p) => p.id === projectId);
    const source = sources.get(projectId) ?? (existsSync(sourceFile(projectId)) ? readJson(sourceFile(projectId)) : null);
    if (!project || !source) {
      error(path, '', `no source file for project "${projectId}"`);
      continue;
    }
    const locale = loadLocale(folder, projectId);
    for (const [key, value] of Object.entries(locale)) {
      const entry = source[key];
      if (!entry) {
        warning(path, key, 'key is not in the source any more (npm run format -- --prune removes it)');
        continue;
      }
      checkTranslation(path, key, entry, value, project, allowed, language);
    }
  }
}

function checkTranslation(path, key, entry, value, project, allowed, language) {
  if (isPlural(entry.text) !== isPlural(value)) {
    error(path, key, isPlural(entry.text) ? 'the source is a plural: give an object of plural forms' : 'the source is not a plural: give a plain string');
    return;
  }
  if (typeof value !== 'string' && !isPlural(value)) {
    error(path, key, 'a translation must be a string or an object of plural forms');
    return;
  }
  if (isPlural(value)) {
    if (typeof value.other !== 'string') error(path, key, 'a plural needs an "other" form');
    for (const category of Object.keys(value)) {
      if (!allowed.has(category)) error(path, key, `"${category}" is not a plural category of ${language.code} (use ${[...allowed].join(', ')})`);
    }
    const missing = [...allowed].filter((category) => !(category in value));
    if (missing.length) warning(path, key, `plural forms missing: ${missing.join(', ')} (falls back to "other")`);
  }
  for (const [category, text] of forms(value)) {
    const label = category ? ` (${category})` : '';
    if (typeof text !== 'string' || text.trim() === '') {
      error(path, key, `empty translation${label}: leave the key out instead`);
      continue;
    }
    const sourceText = isPlural(entry.text) ? entry.text[category] ?? entry.text.other : entry.text;
    const result = comparePlaceholders(sourceText, text, project.placeholders);
    const lenient = category && category !== 'other';
    if (result.missing.length) {
      (lenient ? warning : error)(path, key, `placeholder missing${label}: ${result.missing.join(' ')}`);
    }
    if (result.extra.length) error(path, key, `placeholder not in the source${label}: ${result.extra.join(' ')}`);
    if (result.changed.length) error(path, key, `placeholder of another type${label}: ${result.changed.join(' ')}`);
    if (result.mixed) error(path, key, `numbered and unnumbered placeholders are mixed${label}`);
    if (/^\s/.test(sourceText) !== /^\s/.test(text) || /\s$/.test(sourceText) !== /\s$/.test(text)) {
      warning(path, key, `leading or trailing space differs from the source${label}`);
    }
    if (entry.maxLength && [...text].length > entry.maxLength) {
      warning(path, key, `longer than maxLength ${entry.maxLength}${label}`);
    }
    for (const { term, pattern } of keepTerms) {
      if (pattern.test(sourceText) && !text.includes(term)) {
        warning(path, key, `"${term}" is kept as it is in every language (see glossary.json)${label}`);
      }
    }
  }
}

// --- report ----------------------------------------------------------------

const errors = problems.filter((p) => p.level === 'error');
const warnings = problems.filter((p) => p.level === 'warning');
if (options.json) {
  // Machine readable, for editors and other tools.
  console.log(JSON.stringify({ errors: errors.length, warnings: warnings.length, problems }, null, 2));
  process.exit(errors.length || (options.strict && warnings.length) ? 1 : 0);
}
const shown = options.quiet ? errors : problems;
const byFile = new Map();
for (const problem of shown) {
  if (!byFile.has(problem.file)) byFile.set(problem.file, []);
  byFile.get(problem.file).push(problem);
}
const limit = Number(options.limit ?? 50);
for (const [file, list] of byFile) {
  console.log(`\n${file}`);
  for (const problem of list.slice(0, limit)) {
    console.log(`  ${problem.level === 'error' ? 'error  ' : 'warning'}  ${problem.key ? `${problem.key}: ` : ''}${problem.message}`);
  }
  if (list.length > limit) console.log(`  … ${list.length - limit} more`);
}
// On GitHub, problems also show up next to the changed files of a pull request.
if (process.env.GITHUB_ACTIONS) {
  const data = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const property = (text) => data(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
  for (const problem of problems.slice(0, 200)) {
    const title = problem.key ? property(problem.key) : 'translations';
    console.log(`::${problem.level} file=${property(problem.file)},title=${title}::${data(problem.message)}`);
  }
}

console.log(`\n${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
if (errors.length || (options.strict && warnings.length)) process.exit(1);
