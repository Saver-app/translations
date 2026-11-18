#!/usr/bin/env node
// Shows how much of each project is translated into each language.
//
//   npm run stats             print the table
//   npm run stats -- --write  also update the table in README.md

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, activeProjects, isTranslated, loadLanguages, loadLocale, loadSource, parseArgs, writeText } from './lib.mjs';

const { options } = parseArgs();
const { source: sourceLang, all: languages } = loadLanguages();
const projects = activeProjects();
const sources = new Map(projects.map((project) => [project.id, loadSource(project.id)]));

const STATUS = { machine: 'machine translated', review: 'in review', reviewed: 'reviewed' };
const header = ['Language', ...projects.map((project) => project.name), 'Status'];
const rows = [];
for (const language of languages) {
  if (language.code === sourceLang) continue;
  const cells = projects.map((project) => {
    const source = sources.get(project.id);
    const locale = loadLocale(language.code, project.id);
    const total = Object.keys(source).length;
    const done = Object.keys(source).filter((key) => isTranslated(locale[key])).length;
    return total ? `${Math.floor((done / total) * 100)} %` : '–';
  });
  rows.push([`${language.nativeName} (\`${language.code}\`)`, ...cells, STATUS[language.status] ?? language.status]);
}
const totals = projects.map((project) => `${Object.keys(sources.get(project.id)).length}`);
rows.push(['**Strings in English**', ...totals.map((total) => `**${total}**`), '']);

const table = [header, header.map(() => '---'), ...rows].map((row) => `| ${row.join(' | ')} |`).join('\n');
console.log(table);

if (options.write) {
  const readme = join(ROOT, 'README.md');
  const text = readFileSync(readme, 'utf8');
  const start = '<!-- stats:start -->';
  const end = '<!-- stats:end -->';
  if (!text.includes(start) || !text.includes(end)) {
    console.error(`README.md needs the markers ${start} and ${end}`);
    process.exit(1);
  }
  const next = text.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n${table}\n${end}`);
  console.log(writeText(readme, next) ? '\nUpdated README.md' : '\nREADME.md was up to date');
}
