# File format

Everything in this repository is plain JSON, so it can be edited by hand on GitHub today and by an editing platform (website or app) later without converting anything.

## The three kinds of files

| File | Who edits it | What it holds |
| --- | --- | --- |
| `languages.json` | maintainers | Every supported language: code, names, writing direction, plural categories, platform codes, translation status, style notes |
| `projects.json` | maintainers | Every app that uses these strings and where its generated files go |
| `glossary.json` | maintainers, translators | Product terms and how each language translates them |
| `source/<project>.json` | developers | The English source strings of one project, with context for translators |
| `locales/<language>/<project>.json` | translators | The translations of one project into one language |

## Source files

`source/<project>.json` maps a key to an entry. The key is how the app looks the string up. The order of the keys is the order of the screens, so related strings stay together.

```json
{
  "settings.language.title": {
    "text": "Language",
    "context": "Title of the row in Settings that opens the language picker."
  },
  "tasks.count": {
    "text": { "one": "{count} task", "other": "{count} tasks" },
    "context": "Number of tasks shown under a folder name.",
    "placeholders": { "{count}": "Number of tasks" }
  }
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `text` | yes | The English text. A string, or an object of plural forms for strings that depend on a number. |
| `context` | yes | One short sentence for translators: where the string appears and what it does. |
| `placeholders` | no | What each placeholder stands for, keyed by the placeholder exactly as it appears in the text. |
| `maxLength` | no | A hard limit in characters, for very tight spots such as tab bar labels. |

## Locale files

`locales/<language>/<project>.json` maps the same keys to the translated text only. Context lives in the source file and is not repeated.

```json
{
  "settings.language.title": "Sprache",
  "tasks.count": { "one": "{count} Aufgabe", "other": "{count} Aufgaben" }
}
```

A key that is missing from a locale file is untranslated, and the app shows the English text. Keys that no longer exist in the source are reported by `npm run validate` and removed by `npm run format`.

## Plurals

A string that depends on a number has one form per [CLDR plural category](https://cldr.unicode.org/index/cldr-spec/plural-rules) of the language: `zero`, `one`, `two`, `few`, `many`, `other`. The categories each language needs are listed in `languages.json` under `plurals`. `other` is always required. Japanese, Korean, Chinese and Indonesian only have `other`; Russian has `one`, `few`, `many`, `other`; Arabic has all six.

## Placeholders

Placeholders are copied into every translation exactly as they appear in the English text. They may move to wherever the grammar of the language needs them. Each project uses the placeholder syntax of its platform, so the files can be handed to the apps without rewriting:

| Project | Placeholder syntax | Examples |
| --- | --- | --- |
| `web` | `{name}` | `{count}`, `{space}` |
| `ios`, `ios-share-extension`, `macos` | Apple format specifiers | `%@`, `%lld`, `%1$@`, `%2$lld`, `%%` for a literal percent sign |
| `android` | Java format specifiers, always numbered | `%1$s`, `%2$d`, `%%` for a literal percent sign |

On iOS and the Mac the key of a string is its English text, as in an Xcode String Catalog. On Android and the web keys are names.

Text is stored as plain text. Escaping for the target format (XML for Android, JSON for iOS and the Mac) is done when the files are generated, so an apostrophe is written as `'`, never `\'`.

## Keys

* Web: dot separated, feature first, camelCase segments: `settings.account.deleteTitle`.
* Android: Android resource names, snake case, feature first: `settings_account_delete_title`.
* iOS and Mac: the English text, as Xcode extracts it from the code (`Delete Account`, `%lld tasks`).

A key never changes its meaning. If the English text of a string changes so much that existing translations become wrong, the string gets a new key.
