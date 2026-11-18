// The pure part of the tooling: no file system, no Node.js APIs. It runs in
// Node and in browsers alike, so a future editing website or app can import
// it and check translations with exactly the rules CI uses.

export const isPlural = (text) => text !== null && typeof text === 'object' && !Array.isArray(text);

/** Every text of a string: one for a plain string, one per form for a plural. */
export function forms(text) {
  return isPlural(text) ? Object.entries(text) : [[null, text]];
}

/** True when a translation has text in it (plural objects need an `other` form). */
export function isTranslated(value) {
  if (typeof value === 'string') return value.trim() !== '';
  if (isPlural(value)) return typeof value.other === 'string' && value.other.trim() !== '';
  return false;
}

/** Puts the keys of a locale file into the order of the source file. Unknown keys go last. */
export function orderLike(source, locale, { prune = false } = {}) {
  const ordered = {};
  for (const key of Object.keys(source)) {
    if (key in locale) ordered[key] = orderPlural(locale[key]);
  }
  if (!prune) {
    for (const key of Object.keys(locale)) {
      if (!(key in ordered)) ordered[key] = orderPlural(locale[key]);
    }
  }
  return ordered;
}

const PLURAL_ORDER = ['zero', 'one', 'two', 'few', 'many', 'other'];

export function orderPlural(value) {
  if (!isPlural(value)) return value;
  const ordered = {};
  for (const category of PLURAL_ORDER) if (category in value) ordered[category] = value[category];
  for (const category of Object.keys(value)) if (!(category in ordered)) ordered[category] = value[category];
  return ordered;
}

export { PLURAL_ORDER };

// ---------------------------------------------------------------------------
// Placeholders

const BRACES = /\{([A-Za-z0-9_]+)\}/g;
// printf-style format specifiers as Apple's Foundation reads them. The space flag is
// left out on purpose, so plain text such as "100% done" is not read as "% d".
const APPLE = /%(?:(\d+)\$)?[-+#0']*(?:\d+|\*)?(?:\.(?:\d+|\*))?(hh|h|ll|l|q|L|z|t|j)?([@dDiuUxXoOfFeEgGcCsSpaA%])/g;
// java.util.Formatter specifiers as Android's getString() reads them.
const JAVA = /%(?:(\d+)\$)?[-#+0,(<]*(?:\d+)?(?:\.\d+)?([tT][a-zA-Z]|[a-zA-Z%])/g;

function appleKind(conversion) {
  if (conversion === '@') return 'object';
  if ('dDiuUxXoO'.includes(conversion)) return 'integer';
  if ('fFeEgGaA'.includes(conversion)) return 'decimal';
  if ('cC'.includes(conversion)) return 'character';
  if ('sS'.includes(conversion)) return 'c-string';
  return 'pointer';
}

function javaKind(conversion) {
  const c = conversion.toLowerCase();
  if (c === 's') return 'string';
  if ('dox'.includes(c) && c.length === 1) return 'integer';
  if ('efga'.includes(c) && c.length === 1) return 'decimal';
  if (c === 'c') return 'character';
  if (c === 'b') return 'boolean';
  if (c.startsWith('t')) return 'date';
  if (c === 'h') return 'hash';
  return `%${conversion}`;
}

/**
 * Reads the placeholders of a text in the given syntax ("braces", "apple" or
 * "java"). Returns a map from the placeholder's identity (its name, or its
 * position for printf styles) to its kind, plus the tokens as written.
 */
export function placeholders(text, syntax) {
  const found = new Map();
  const tokens = [];
  let mixed = false;
  if (syntax === 'braces') {
    for (const match of text.matchAll(BRACES)) {
      found.set(match[1], 'value');
      tokens.push(match[0]);
    }
    return { found, tokens, mixed };
  }
  const pattern = syntax === 'apple' ? APPLE : JAVA;
  let next = 1;
  let numbered = false;
  let unnumbered = false;
  for (const match of text.matchAll(pattern)) {
    const conversion = syntax === 'apple' ? match[3] : match[2];
    if (conversion === '%' || conversion === 'n') continue; // literal percent sign, line break
    tokens.push(match[0]);
    let position;
    if (match[1]) {
      numbered = true;
      position = Number(match[1]);
    } else {
      unnumbered = true;
      position = next++;
    }
    found.set(String(position), syntax === 'apple' ? appleKind(conversion) : javaKind(conversion));
  }
  mixed = numbered && unnumbered;
  return { found, tokens, mixed };
}

/** Compares the placeholders of a translation with those of the source text. */
export function comparePlaceholders(sourceText, translatedText, syntax) {
  const source = placeholders(sourceText, syntax);
  const translated = placeholders(translatedText, syntax);
  const missing = [];
  const extra = [];
  const changed = [];
  for (const [id, kind] of source.found) {
    if (!translated.found.has(id)) missing.push(describe(id, syntax, source));
    else if (translated.found.get(id) !== kind) changed.push(describe(id, syntax, source));
  }
  for (const id of translated.found.keys()) {
    if (!source.found.has(id)) extra.push(describe(id, syntax, translated));
  }
  return { missing, extra, changed, mixed: translated.mixed };
}

function describe(id, syntax, parsed) {
  if (syntax === 'braces') return `{${id}}`;
  const index = [...parsed.found.keys()].indexOf(id);
  return parsed.tokens[index] ?? `#${id}`;
}

// ---------------------------------------------------------------------------
// Android string resources

/** Escapes plain text for an Android <string> or <item> element (aapt2 rules). */
export function androidEscape(text) {
  let escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  if (/^[@?]/.test(escaped)) escaped = '\\' + escaped;
  // aapt2 trims and collapses whitespace unless the value is quoted.
  if (/^\s|\s$|\s{2,}/.test(text.replace(/\n|\t/g, 'x'))) escaped = `"${escaped}"`;
  return escaped;
}

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return XML_ENTITIES[name] ?? whole;
  });
}

/** Turns the raw content of a <string> element back into plain text (aapt2 rules). */
export function androidUnescape(raw) {
  let text = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, data) => data.replace(/[&<>]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt' }[c]};`));
  text = decodeEntities(text);
  let out = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length) {
      const n = text[++i];
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) {
        out += String.fromCharCode(parseInt(text.slice(i + 1, i + 5), 16));
        i += 4;
      } else out += n;
      continue;
    }
    if (c === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && /\s/.test(c)) {
      if (!out.endsWith(' ') || out.length === 0) out += ' ';
      continue;
    }
    out += c;
  }
  // Unquoted leading and trailing whitespace is dropped by aapt2.
  return raw.trim().startsWith('"') && raw.trim().endsWith('"') ? out : out.replace(/^ +| +$/g, '');
}

/** Reads <string> and <plurals> from an Android strings.xml (translatable ones only). */
export function parseAndroidStrings(xml) {
  const result = {};
  const body = xml.replace(/<!--[\s\S]*?-->/g, '');
  const element = /<(string|plurals)\b([^>]*)>([\s\S]*?)<\/\1>|<string\b([^>]*)\/>/g;
  for (const match of body.matchAll(element)) {
    const attributes = match[2] ?? match[4] ?? '';
    const name = /\bname="([^"]+)"/.exec(attributes)?.[1];
    if (!name || /\btranslatable="false"/.test(attributes)) continue;
    if (match[1] === 'plurals') {
      const plural = {};
      for (const item of match[3].matchAll(/<item\b[^>]*\bquantity="([^"]+)"[^>]*>([\s\S]*?)<\/item>/g)) {
        plural[item[1]] = androidUnescape(item[2]);
      }
      result[name] = orderPlural(plural);
    } else {
      result[name] = androidUnescape(match[3] ?? '');
    }
  }
  return result;
}

export const GENERATED_NOTICE =
  'Generated from https://github.com/Saver-app/translations. Do not edit this file by hand: change the translation there and run the sync script.';

/** Writes an Android strings.xml for one language. */
export function androidXml(source, translations) {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', `<!-- ${GENERATED_NOTICE} -->`, '<resources>'];
  for (const key of Object.keys(source)) {
    const value = translations[key];
    if (!isTranslated(value)) continue;
    if (isPlural(value)) {
      lines.push(`    <plurals name="${key}">`);
      for (const [category, text] of Object.entries(orderPlural(value))) {
        lines.push(`        <item quantity="${category}">${androidEscape(text)}</item>`);
      }
      lines.push('    </plurals>');
    } else {
      lines.push(`    <string name="${key}">${androidEscape(value)}</string>`);
    }
  }
  lines.push('</resources>', '');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Xcode String Catalogs (.xcstrings)

function unit(value) {
  return { stringUnit: { state: 'translated', value } };
}

/** The `localizations` entry of one language for a text. */
export function xcLocalization(text) {
  if (!isPlural(text)) return unit(text);
  const plural = {};
  for (const [category, value] of Object.entries(orderPlural(text))) plural[category] = unit(value);
  return { variations: { plural } };
}

/** Serializes like Xcode does: two space indent, " : " between key and value, sorted keys. */
export function stringifyXcstrings(value, indent = '') {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const inner = indent + '  ';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[\n\n' + indent + ']';
    return '[\n' + value.map((item) => inner + stringifyXcstrings(item, inner)).join(',\n') + '\n' + indent + ']';
  }
  const keys = Object.keys(value).sort(compareUtf16);
  if (keys.length === 0) return '{\n\n' + indent + '}';
  return (
    '{\n' +
    keys.map((key) => `${inner}${JSON.stringify(key)} : ${stringifyXcstrings(value[key], inner)}`).join(',\n') +
    '\n' +
    indent +
    '}'
  );
}

function compareUtf16(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Merges translations into an existing catalog (or a new one). Keys, comments
 * and English values that the app already has are kept: the app owns them.
 * Only the localizations of the managed languages are replaced.
 */
export function mergeCatalog(existing, source, translationsByLang, { iosCodes, sourceCode = 'en' }) {
  const catalog = existing ? structuredClone(existing) : { sourceLanguage: sourceCode, strings: {}, version: '1.0' };
  catalog.strings ??= {};
  for (const [key, entry] of Object.entries(source)) {
    const current = catalog.strings[key] ?? {};
    if (!current.comment && entry.context) current.comment = entry.context;
    const localizations = current.localizations ?? {};
    const englishDiffers = isPlural(entry.text) || entry.text !== key;
    if (englishDiffers && !localizations[sourceCode]) localizations[sourceCode] = xcLocalization(entry.text);
    for (const [lang, code] of Object.entries(iosCodes)) {
      if (lang === sourceCode) continue;
      const value = translationsByLang[lang]?.[key];
      if (isTranslated(value)) localizations[code] = xcLocalization(value);
      else delete localizations[code];
    }
    if (Object.keys(localizations).length) current.localizations = localizations;
    else delete current.localizations;
    catalog.strings[key] = current;
  }
  return catalog;
}

