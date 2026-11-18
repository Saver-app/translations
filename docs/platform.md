# Plan: an editing platform on top of this repository

Today translations are edited as files on GitHub. Later a website and an app should let anyone browse and edit them without knowing Git. This page describes how that platform fits onto what is already here, so nothing in the repository has to change when it is built.

## Principle: the repository stays the source of truth

The platform is a friendly front end. It reads the JSON files and writes changes back as commits or pull requests. There is no second database that can drift from the repository, CI keeps validating every change, and the apps keep pulling translations the same way they do now.

## The data model is already here

| Platform concept | Where it lives |
| --- | --- |
| Languages, with native name, writing direction, plural categories, review status, style guide | `languages.json` |
| Projects (iOS, Android, web, …) | `projects.json` |
| Strings: key, English text, context, placeholders, length limit | `source/<project>.json` |
| Translations: one value per key, language and project | `locales/<lang>/<project>.json` |
| Terminology | `glossary.json` |
| Rules a translation must pass | `scripts/core.mjs` (no Node.js APIs, runs in the browser) |

The natural screen is a table per project and language: key, English text, context, the translation as an editable field, and a status. Plural strings show one field per category of the language (`plurals` in `languages.json`), placeholders are shown as chips that cannot be deleted. `comparePlaceholders()` and the plural rules in `core.mjs` give the same answers in the editor as `npm run validate` gives in CI.

## Reading

All files are static JSON. A website can read them without a backend from `raw.githubusercontent.com` or the GitHub contents API. For speed, CI can publish `dist/` (already built on every push) and a merged JSON per language to a CDN.

## Writing

1. A GitHub App (or OAuth sign-in with GitHub) acts for the user.
2. Every saved change becomes a commit on a branch, and a pull request per language and session ("German: 12 strings from Paul via the editor").
3. CI validates the pull request as it does today; reviewers for the language approve and merge.
4. Trusted reviewers can be allowed to commit to `main` directly.

People without a GitHub account can be supported later by letting the platform's own bot open the pull request for them.

## Review state per string

Today `status` in `languages.json` tracks review per language (`machine` → `review` → `reviewed`). For per-string review the platform can add, without changing any existing file:

```
reviews/<lang>/<project>.json
{ "settings.language.title": { "by": "github-user", "at": "2026-11-20", "source": "<hash of the English text>" } }
```

A string counts as reviewed while the hash still matches the English text. When the English text changes, the hash no longer matches and the string shows up as "needs review" again. `stats.mjs` and the editor can then show reviewed percentages next to translated percentages.

## Getting changes into the apps

* Now: before a release, run `npm run sync` against a checkout of the app and commit the result.
* Next step: a scheduled GitHub Action that runs the sync and opens a pull request in each app repository when translations changed.
* Later, over the air: the web app can load `src/i18n/locales/<lang>.json` from a CDN instead of its own build; the mobile apps can download the same files at launch and fall back to the bundled ones.

## Suggestions and machine translation

The editor can offer a suggestion for an empty field (from a translation API or an LLM) and a "same English text elsewhere" suggestion from other projects, since iOS, Android and the web share many strings. Suggested text is saved like any other edit, so it goes through review like everything else.
