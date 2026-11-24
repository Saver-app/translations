# Saver translations

Every text of the Saver apps on iOS, Android, the Mac and the web, in 14 languages. The apps read their translations from here, and anyone can improve them.

> **Machine translated.** All languages except English were translated with AI and have not been checked by native speakers yet. If you speak one of them, a review is the most useful thing you can do: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Languages

<!-- stats:start -->
| Language | Web app | iOS app | iOS share extension | Android app | Mac app | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Bahasa Indonesia (`id`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| Deutsch (`de`) | 100 % | 100 % | 100 % | 100 % | 100 % | machine translated |
| Español (`es`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| Français (`fr`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| Italiano (`it`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| Português (Brasil) (`pt-BR`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| Türkçe (`tr`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| Русский (`ru`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| العربية (`ar`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| हिन्दी (`hi`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| 日本語 (`ja`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| 한국어 (`ko`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| 简体中文 (`zh-Hans`) | 100 % | 91 % | 100 % | 89 % | 100 % | machine translated |
| **Strings in English** | **743** | **683** | **50** | **603** | **591** |  |
<!-- stats:end -->

The apps follow the language of the device and let people pick another one in Settings (on the Mac in System Settings).

## How to help

1. Find the text you want to change in `locales/<your language>/` (`web.json`, `ios.json`, `android.json`, …). The English original and a note on where it appears are in the file with the same name in `source/`.
2. Edit the file right here on GitHub (pencil icon) and propose the change. Checks run automatically and point out a missing placeholder or plural form.

The details, rules per language and the review process are in [CONTRIBUTING.md](CONTRIBUTING.md). Found something wrong but don't want to edit files? [Open an issue](https://github.com/Saver-app/translations/issues/new/choose).

## What is in here

```
languages.json            supported languages, their plural rules, platform codes, review status, style notes
projects.json             the apps that use these strings and where their files go
glossary.json             product terms (Space, Habit, Streak…) and how each language translates them
source/<project>.json     English text + context for translators, one file per project
locales/<lang>/<project>.json   the translations
schema/                   JSON Schemas for all of the above
scripts/                  validation, formatting and the export to iOS, Android, Mac and web
docs/                     the file format and the plan for an editing platform
```

Projects: `web` (web app), `ios` (iOS app), `ios-share-extension` (the "Share to Saver" sheet on iOS), `android` (Android app) and `macos` (Mac app).

Everything is plain JSON with one simple shape, described in [docs/format.md](docs/format.md), so the same files can later be edited through a website or app on top of this repository: see [docs/platform.md](docs/platform.md).

## For developers

Node.js 20 or newer, no dependencies to install.

| Command | What it does |
| --- | --- |
| `npm run validate` | Checks every file: keys, plural forms, placeholders, glossary names. CI runs it on every pull request. |
| `npm run format` | Rewrites the JSON files in one consistent shape (`-- --check` only reports, `-- --prune` drops keys the source no longer has). |
| `npm run import -- --web ../web-app --ios ../iOS-app --android ../android-app --macos ../macos-app` | Reads the English strings from local checkouts of the apps into `source/`. New keys get an empty context to fill in. |
| `npm run sync -- --web ../web-app --ios ../iOS-app --android ../android-app --macos ../macos-app` | Writes the translations into the apps. English stays as the app has it. `-- --check` reports what is out of date. |
| `npm run build` | Writes all platform files to `dist/`, laid out like the app repositories. CI uploads them as an artifact. |
| `npm run stats -- --write` | Updates the table above. |

The apps own their English text. The usual round trip when strings change in an app:

1. Change the strings in the app as usual (`Text("…")` on iOS and the Mac, `strings.xml` on Android, `src/i18n/locales/en.json` on the web).
2. `npm run import -- --<app> <path>` and write a context for each new key in `source/<project>.json`.
3. Translate the new keys (or let translators do it), `npm run validate`.
4. `npm run sync -- --<app> <path>` and commit the result in the app.

What each app gets:

| App | Files | Language setting |
| --- | --- | --- |
| Web | `src/i18n/locales/<lang>.json`, loaded on demand | Settings › Appearance › Language, saved in the browser |
| iOS | `Saver/Localizable.xcstrings`, `Saver share extension/Localizable.xcstrings` | Settings › Make It Yours › Language opens the per-app language setting of iOS |
| Android | `app/src/main/res/values-<lang>/strings.xml` | Settings › Make it yours › Language, plus the per-app language setting of Android 13+ |
| Mac | `Saver/Resources/Localizable.xcstrings` | The language of the Mac, or one for Saver alone in System Settings › General › Language & Region › Applications |
