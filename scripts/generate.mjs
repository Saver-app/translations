// Turns the repository data into the files each platform reads.
// Used by build.mjs (writes dist/) and sync.mjs (writes into app checkouts).

import {
  androidXml,
  isTranslated,
  loadLanguages,
  loadLocale,
  loadSource,
  mergeCatalog,
  orderLike,
  outputPath,
  stringifyJson,
  stringifyXcstrings,
} from './lib.mjs';

/** The translations of a project for every language, the source language included. */
export function collect(project) {
  const source = loadSource(project.id);
  const { source: sourceLang, all } = loadLanguages();
  const byLang = {};
  for (const language of all) {
    if (language.code === sourceLang) {
      byLang[language.code] = Object.fromEntries(Object.entries(source).map(([key, entry]) => [key, entry.text]));
    } else {
      const locale = loadLocale(language.code, project.id);
      byLang[language.code] = Object.fromEntries(
        Object.entries(orderLike(source, locale, { prune: true })).filter(([, value]) => isTranslated(value)),
      );
    }
  }
  return { source, sourceLang, languages: all, byLang };
}

/**
 * Files of one project as { path, content, language } with paths relative to
 * the app checkout. `existing(path)` returns the current content of a file in
 * the target (or null) so String Catalogs can be merged instead of replaced.
 * With includeSource false, files that only hold the source language are left
 * out, because the apps own their English text.
 */
export function filesFor(project, { includeSource = true, existing = () => null } = {}) {
  const { source, sourceLang, languages, byLang } = collect(project);
  const files = [];
  if (project.format === 'web-json') {
    for (const language of languages) {
      if (language.code === sourceLang && !includeSource) continue;
      files.push({ path: outputPath(project, language), content: stringifyJson(byLang[language.code]), language: language.code });
    }
  } else if (project.format === 'android-xml') {
    for (const language of languages) {
      if (language.code === sourceLang && !includeSource) continue;
      files.push({ path: outputPath(project, language), content: androidXml(source, byLang[language.code]), language: language.code });
    }
  } else if (project.format === 'xcstrings') {
    const path = outputPath(project, languages[0]);
    const current = existing(path);
    // iOS and the Mac use the same Apple localization codes (platforms.ios).
    const iosCodes = Object.fromEntries(languages.map((language) => [language.code, language.platforms?.ios ?? language.code]));
    const catalog = mergeCatalog(current ? JSON.parse(current) : null, source, byLang, { iosCodes, sourceCode: sourceLang });
    files.push({ path, content: stringifyXcstrings(catalog) + '\n', language: '*' });
  } else {
    throw new Error(`Unknown format "${project.format}" in project "${project.id}"`);
  }
  return files;
}
