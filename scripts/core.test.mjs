import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  androidEscape,
  androidUnescape,
  androidXml,
  comparePlaceholders,
  mergeCatalog,
  parseAndroidStrings,
  placeholders,
  stringifyXcstrings,
} from './core.mjs';

test('brace placeholders are compared by name', () => {
  assert.deepEqual(comparePlaceholders('{count} tasks in {space}', 'In {space}: {count} Aufgaben', 'braces'), {
    missing: [],
    extra: [],
    changed: [],
    mixed: false,
  });
  const result = comparePlaceholders('Hi {name}', 'Hallo {nom}', 'braces');
  assert.deepEqual(result.missing, ['{name}']);
  assert.deepEqual(result.extra, ['{nom}']);
});

test('Apple specifiers may be reordered with positions', () => {
  const ok = comparePlaceholders('%@ invited you to %@', '%2$@ : invitation de %1$@', 'apple');
  assert.deepEqual([ok.missing, ok.extra, ok.changed, ok.mixed], [[], [], [], false]);
  const wrongType = comparePlaceholders('%lld tasks', '%@ Aufgaben', 'apple');
  assert.deepEqual(wrongType.changed, ['%lld']);
  assert.equal(placeholders('100%% done, %lld left', 'apple').found.size, 1);
  assert.equal(placeholders('100% done', 'apple').found.size, 0);
});

test('Java specifiers are compared by position and type', () => {
  const ok = comparePlaceholders('%1$s has %2$d tasks', '%2$d Aufgaben für %1$s', 'java');
  assert.deepEqual([ok.missing, ok.extra, ok.changed], [[], [], []]);
  const missing = comparePlaceholders('%1$s has %2$d tasks', '%1$s hat Aufgaben', 'java');
  assert.deepEqual(missing.missing, ['%2$d']);
  assert.equal(comparePlaceholders('%s and %1$s', '%s and %1$s', 'java').mixed, true);
});

test('Android escaping survives a round trip', () => {
  for (const text of [
    "Don't stop",
    'Say "hi" & <wave>',
    '@home',
    '?maybe',
    'Line one\nline two',
    'back\\slash',
    '  padded  ',
    'Two  spaces',
    '50 % sicher',
  ]) {
    assert.equal(androidUnescape(androidEscape(text)), text, text);
  }
});

test('Android strings.xml is parsed and written', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Tasks -->
    <string name="app_name" translatable="false">Saver</string>
    <string name="todos_title">Tasks</string>
    <string name="todos_hint">Don\\'t forget &amp; enjoy</string>
    <plurals name="todos_count">
        <item quantity="one">%1$d task</item>
        <item quantity="other">%1$d tasks</item>
    </plurals>
</resources>`;
  const parsed = parseAndroidStrings(xml);
  assert.deepEqual(parsed, {
    todos_title: 'Tasks',
    todos_hint: "Don't forget & enjoy",
    todos_count: { one: '%1$d task', other: '%1$d tasks' },
  });
  const source = Object.fromEntries(Object.entries(parsed).map(([key, text]) => [key, { text, context: '' }]));
  const out = androidXml(source, { todos_title: 'Aufgaben', todos_count: { one: '%1$d Aufgabe', other: '%1$d Aufgaben' } });
  assert.match(out, /<string name="todos_title">Aufgaben<\/string>/);
  assert.match(out, /<item quantity="one">%1\$d Aufgabe<\/item>/);
  assert.doesNotMatch(out, /todos_hint/);
  assert.deepEqual(parseAndroidStrings(out), { todos_title: 'Aufgaben', todos_count: { one: '%1$d Aufgabe', other: '%1$d Aufgaben' } });
});

test('String Catalogs are merged without touching what the app owns', () => {
  const existing = {
    sourceLanguage: 'en',
    strings: {
      'Delete Space': { comment: 'From code', localizations: { fr: { stringUnit: { state: 'translated', value: 'old' } } } },
      'Not in repo': { extractionState: 'manual' },
    },
    version: '1.0',
  };
  const source = {
    'Delete Space': { text: 'Delete Space', context: 'Button' },
    '%lld tasks': { text: { one: '%lld task', other: '%lld tasks' }, context: 'Count' },
  };
  const merged = mergeCatalog(
    existing,
    source,
    { de: { 'Delete Space': 'Space löschen', '%lld tasks': { one: '%lld Aufgabe', other: '%lld Aufgaben' } }, fr: {} },
    { iosCodes: { en: 'en', de: 'de', fr: 'fr' } },
  );
  assert.equal(merged.strings['Delete Space'].comment, 'From code');
  assert.equal(merged.strings['Delete Space'].localizations.de.stringUnit.value, 'Space löschen');
  assert.equal(merged.strings['Delete Space'].localizations.fr, undefined);
  assert.equal(merged.strings['Delete Space'].localizations.en, undefined);
  assert.deepEqual(merged.strings['Not in repo'], { extractionState: 'manual' });
  assert.equal(merged.strings['%lld tasks'].localizations.en.variations.plural.one.stringUnit.value, '%lld task');
  assert.equal(merged.strings['%lld tasks'].localizations.de.variations.plural.other.stringUnit.value, '%lld Aufgaben');
});

test('String Catalogs are written the way Xcode writes them', () => {
  const text = stringifyXcstrings({ version: '1.0', strings: { b: {}, a: { comment: 'x' } }, sourceLanguage: 'en' });
  assert.equal(
    text,
    '{\n  "sourceLanguage" : "en",\n  "strings" : {\n    "a" : {\n      "comment" : "x"\n    },\n    "b" : {\n\n    }\n  },\n  "version" : "1.0"\n}',
  );
});
