#!/usr/bin/env node
// Builds the platform files of every project into dist/<app>/, laid out like
// the app repositories, so they can be inspected, downloaded by CI or copied.
//
//   npm run build

import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { filesFor } from './generate.mjs';
import { ROOT, activeProjects, relative, writeText } from './lib.mjs';

const dist = join(ROOT, 'dist');
rmSync(dist, { recursive: true, force: true });
let count = 0;
for (const project of activeProjects()) {
  for (const file of filesFor(project, { includeSource: true })) {
    writeText(join(dist, project.app, file.path), file.content);
    count++;
  }
}
console.log(`Wrote ${count} files to ${relative(dist)}/`);
