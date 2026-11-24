// Node.js helpers for the scripts in this folder (files, command line).
// Everything that does not need Node.js lives in core.mjs and is re-exported here.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export * from './core.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Files

export function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${relative(file)}: ${error.message}`);
  }
}

export function stringifyJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

/** Writes a file only when its content changes. Returns true when it changed. */
export function writeText(file, text) {
  if (existsSync(file) && readFileSync(file, 'utf8') === text) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return true;
}

export function writeJson(file, value) {
  return writeText(file, stringifyJson(value));
}

export function relative(file) {
  return file.startsWith(ROOT + '/') ? file.slice(ROOT.length + 1) : file;
}

// ---------------------------------------------------------------------------
// Repository data

export function loadLanguages() {
  const data = readJson(join(ROOT, 'languages.json'));
  return { source: data.sourceLanguage, all: data.languages };
}

export function loadProjects() {
  return readJson(join(ROOT, 'projects.json')).projects;
}

/** The apps of projects.json (web, ios, …), which import and sync take as options. */
export function appNames() {
  return [...new Set(loadProjects().map((project) => project.app))];
}

export const sourceFile = (project) => join(ROOT, 'source', `${project}.json`);
export const localeFile = (lang, project) => join(ROOT, 'locales', lang, `${project}.json`);

/** The source strings of a project, or null when the project has none yet. */
export function loadSource(project) {
  const file = sourceFile(project);
  return existsSync(file) ? readJson(file) : null;
}

/** The translations of a project into one language ({} when there are none). */
export function loadLocale(lang, project) {
  const file = localeFile(lang, project);
  return existsSync(file) ? readJson(file) : {};
}

/** Language folders that exist under locales/. */
export function localeFolders() {
  const dir = join(ROOT, 'locales');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Projects that have a source file. */
export function activeProjects() {
  return loadProjects().filter((project) => existsSync(sourceFile(project.id)));
}

// ---------------------------------------------------------------------------
// Command line

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    const [name, inline] = arg.slice(2).split(/=(.*)/s);
    if (inline !== undefined) options[name] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) options[name] = argv[++i];
    else options[name] = true;
  }
  return { options, rest };
}

/** Projects of one app, with the output path for a language filled in. */
export function outputPath(project, language) {
  const code = language.platforms?.[project.app] ?? language.code;
  return project.path
    .replace('{lang}', code)
    .replace('{-lang}', code ? `-${code}` : '');
}
