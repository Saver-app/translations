# Helping with translations

Thank you for making Saver speak your language. You do not need to be a developer: everything here can be done in the browser on GitHub.

## Fix a translation

1. Open `locales/<language>/` and the file of the app you saw the text in: `web.json`, `ios.json`, `ios-share-extension.json` or `android.json`.
2. Search for the text (on GitHub press `t` to find a file, then the browser's search inside it).
3. Click the pencil icon, change the text after the colon, and choose **Propose changes**. GitHub forks the repository for you and opens a pull request.
4. The checks run on your pull request. If one fails, the message says which key and what to fix.

Not sure what a string means? The file with the same name in `source/` has the English original and a `context` that says where it appears. Keys are the same in both files.

## Review a whole language

All languages except English were translated with AI and nobody has checked them yet. Reviewing means reading through a language file next to its source file and fixing what a native speaker would not say. Mention in the pull request that you reviewed a file. Once a language has been reviewed completely, its `status` in `languages.json` changes from `machine` to `reviewed`.

If you plan a bigger review, open an issue first so two people do not review the same file at the same time.

## Rules

**Placeholders stay.** Everything in curly braces (`{count}`, `{space}`) and every format specifier (`%@`, `%lld`, `%1$@`, `%1$s`, `%2$d`) is replaced by the app with a value. Copy them exactly and put them where your grammar needs them. If two of them need to swap places in iOS or Android text, number them: `%1$@` and `%2$@`, `%1$s` and `%2$s`.

**Plurals have one form per category.** A string that depends on a number looks like this:

```json
"tasks.count": { "one": "{count} Aufgabe", "other": "{count} Aufgaben" }
```

Use exactly the categories your language has, as listed under `plurals` in `languages.json`. Russian for example needs `one`, `few`, `many` and `other`; Japanese only `other`. Keep the number placeholder in every form, also in `one`: in many languages `one` is used for 21 or 101 as well.

**Names stay as they are.** Saver, Plus, Pro, Discord, Google and Apple are never translated. The other product terms (Space, Habit, Streak, …) are in `glossary.json` with the agreed translation for each language: use it everywhere, so the app speaks with one voice. If you think a glossary term is wrong, change it in `glossary.json` and in all strings that use it in the same pull request.

**Follow the style of your language.** `style` in `languages.json` says how Saver addresses people in your language (for example "du" in German, "vous" in French) and how buttons are phrased.

**Keep it short.** Buttons, tab labels and titles have little room, often less than in English. If a string has a `maxLength` in the source, stay below it.

**Leave untranslated text out.** If you are unsure about a string, do not copy the English text into your file; leave the key out and the app shows English for it.

**Do not change keys or the source.** Keys and the English text belong to the apps. If the English text itself is wrong, open an issue.

## Check your changes on your computer (optional)

With Node.js 20 or newer:

```
npm run validate -- --lang de
npm run format
```

`validate` finds missing placeholders, plural forms and similar problems; `format` brings the files into the shape CI expects.

## Add a new language

Open an issue with the language you want to add, ideally with an offer to translate or review it. Adding a language takes a small change in each app (its language list and its build), so a maintainer adds it to `languages.json` and creates the folder.
