#!/usr/bin/env node
// Writes the translations into local checkouts of the apps. English stays as
// the app has it: the apps own their source text, this repository owns the
// translations.
//
//   npm run sync -- --web ../web-app --ios ../iOS-app --android ../android-app
//   npm run sync -- --android ../android-app --check   (exit 1 when out of date)

import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { filesFor } from './generate.mjs';
import { GENERATED_NOTICE, activeProjects, loadLanguages, parseArgs, writeText } from './lib.mjs';

const { options } = parseArgs();
const apps = ['web', 'ios', 'android'].filter((app) => typeof options[app] === 'string');
if (!apps.length) {
  console.log('Usage: npm run sync -- [--web <dir>] [--ios <dir>] [--android <dir>] [--check]');
  process.exit(2);
}

const outdated = [];
let written = 0;
for (const app of apps) {
  const dir = resolve(options[app]);
  if (!existsSync(dir)) {
    console.error(`${dir} does not exist`);
    process.exit(2);
  }
  const read = (path) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);
  for (const project of activeProjects().filter((p) => p.app === app)) {
    // A String Catalog that the app does not have yet only appears once the app
    // asks for it; every other format is written as soon as there is a source.
    if (project.format === 'xcstrings' && read(project.path) === null && !options.create) {
      console.log(`${app}: ${project.path} does not exist, skipped (pass --create to add it)`);
      continue;
    }
    for (const file of filesFor(project, { includeSource: false, existing: read })) {
      if (read(file.path) === file.content) continue;
      outdated.push(`${app}: ${file.path}`);
      if (!options.check) {
        writeText(join(dir, file.path), file.content);
        written++;
      }
    }
    if (project.format === 'android-xml') removeRetiredAndroidLocales(dir, project, app);
  }
}

/** Removes generated strings.xml files of languages that are no longer supported. */
function removeRetiredAndroidLocales(dir, project, app) {
  const res = join(dir, project.path.split('/values{-lang}/')[0]);
  if (!existsSync(res)) return;
  const supported = new Set(loadLanguages().all.map((language) => `values-${language.platforms.android}`));
  for (const folder of readdirSync(res)) {
    if (!folder.startsWith('values-') || supported.has(folder)) continue;
    const file = join(res, folder, 'strings.xml');
    if (existsSync(file) && readFileSync(file, 'utf8').includes(GENERATED_NOTICE)) {
      outdated.push(`${app}: remove ${folder}/strings.xml`);
      if (!options.check) rmSync(file);
    }
  }
}

if (options.check) {
  if (outdated.length) {
    console.log(`Out of date:\n  ${outdated.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Everything is in sync.');
} else {
  console.log(written ? `Updated ${written} files:\n  ${outdated.join('\n  ')}` : 'Everything was already in sync.');
}
