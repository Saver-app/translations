# To review: focus mode and the calendar on iOS and Android

On 25 November 2026 the focus mode and calendar texts of the iOS app (57 strings in `ios.json`) and the Android app (61 strings in `android.json`) were machine translated into the 12 languages below. 104 of the 118 strings reuse the wording the web and Mac apps already had in the same language, so the same thing has the same name in every app; 14 had no counterpart and are new. This list names the spots where a native speaker's eye helps most. Everything not listed here follows the web and Mac apps.

iOS keys are the English text, Android keys are names. To change a text, edit `locales/<language>/ios.json` or `android.json` as described in [CONTRIBUTING.md](../../CONTRIBUTING.md).

## In every language

- **The heading after a task is checked off** (iOS `Task Done`, Android `focus_done_title`). The web app (`focus.done.title`) shows the word of the Done button here, which under the big check mark reads like a stray button. On iOS and Android the heading now says that the task is done in es, fr, it, pt-BR, tr, ru, ar, hi and zh-Hans, like the heading `List Done` next to it. The web keeps its wording for now. id, ja and ko keep the web word (`Selesai`, `完了`, `완료`): please confirm it works as a heading. On the Mac the focus window shows the shared button key `Done` in this spot (`Saver/UI/Focus/FocusWindow.swift`), so it needs a key of its own before it can be translated as a heading.
- **`Exit Focus` on iOS** sits at the top left of focus mode in a capsule that never shortens, next to the list name, a progress bar, the count and the options button. The long Russian text ran over both edges of the screen (see below), so es, fr, it, ru, ar and tr now use a short form on iOS. The Android text `focus_exit` keeps the long form, since it is only read aloud. In de, hi, id and ja the text fits but squeezes the count out of the header on the iPhone SE.
- **Other iOS buttons with little room.** `Save to Calendar` shares one row with `Discard`. `Focus on List` is not only read aloud, as its context in `source/ios.json` says: it is the visible capsule at the bottom of a list. `Mark as Done` shares one row with `Pause` and is cut even in English on the iPhone SE. Where a language below names a shorter alternative, it is the one to check first.
- **Android `todos_focus`** is a small button next to "Add reminder" and the iOS `Focus` key is a swipe action on a task. Both have little room. The Android screens were not checked on a device.

## Bahasa Indonesia (`id`)

- `calendar_sign_in_title` (Android): "Masuk untuk menggunakan kalender", since "keep a calendar" has no close match. Alternative: "Masuk untuk mencatat waktu fokus Anda".

## Español (`es`)

- `Focus` (iOS) and `todos_focus` (Android): "Modo concentración" is the web word but long for a swipe action and a small button. Alternative: "Concentrarse".
- `Save to Calendar` (iOS): "Guardar en el calendario" wraps next to "Descartar". Alternative: "Guardar".
- Differs from the web on purpose: `Exit Focus` (iOS) is "Salir"; the heading `Task Done` / `focus_done_title` is "Tarea completada" (web `focus.done.title`: "Hecho"); and the `many` form of `focus_list_progress` has "de" before the noun, which `focus.list.progress` on the web lacks.

## Français (`fr`)

- `Save to Calendar` (iOS): "Enregistrer dans le calendrier" wraps next to "Ignorer". Alternative: "Enregistrer".
- `Focus on List` (iOS): "Se concentrer sur la liste" is cut in the capsule at the bottom of a list on 375 pt wide iPhones. Alternative: "Concentration".
- `calendar_sign_in_title` (Android): "Connectez-vous pour tenir un calendrier" may sound unusual. Alternative: "Connectez-vous pour utiliser le calendrier".
- Differs from the web on purpose: `Exit Focus` (iOS) is "Quitter"; the heading is "Tâche terminée" (web: "Terminé"); and `focus_list_progress` has the narrow no-break space before the colon that `focus.list.progress` on the web lacks.

## Italiano (`it`)

- `Focus` (iOS) and `todos_focus` (Android): "Concentrazione" may be too wide next to "Aggiungi promemoria". Alternative: "Concentrati".
- `calendar_sign_in_title` (Android): "Accedi per tenere un calendario". Alternative: "Accedi per usare il calendario".
- Differs from the web on purpose: `Exit Focus` (iOS) is "Esci", and the heading is "Attività completata" (web: "Fine").

## Português (Brasil) (`pt-BR`)

- `calendar_sign_in_title` (Android): "Entre para ter um calendário". Alternative: "Entre para manter um calendário".
- Differs from the web on purpose: the heading is "Tarefa concluída" (web: "OK").

## Türkçe (`tr`)

- `Tasks done: %lld of %lld` (iOS, screen reader only): "%1$lld/%2$lld görev tamamlandı" matches Android, web and Mac, but VoiceOver may read "3/5" oddly. Alternative: "%2$lld görevin %1$lld tanesi tamamlandı".
- `focus_status_running` (Android notification): "Odaklanıyorsun". Alternative: "Odak modunda", which could be mistaken for Android's own Focus mode.
- `calendar_sign_in_title` (Android): "Takvim tutmak için giriş yap". Alternative: "Takvimi kullanmak için giriş yap".
- Differs from the web on purpose: `Exit Focus` (iOS) is "Odaktan çık", and the heading is "Görev tamamlandı" (web: "Bitti").

## Русский (`ru`)

- `Save to Calendar` (iOS): "Сохранить в календаре" wraps next to "Не сохранять". Alternative: "Сохранить".
- Differs from the web on purpose: `Exit Focus` (iOS) is "Выйти"; the heading is "Задача выполнена" (web: "Готово"); and both checkmarks of the focus options use the same verb form, "Показывать подзадачи" like the Mac (web `focus.options.subtasks`: "Показать подзадачи").

## العربية (`ar`)

- `focus_status_running` (Android notification): "جارٍ التركيز" should read as an ongoing focus session. Alternative: "في وضع التركيز".
- Differs from the web on purpose: `Exit Focus` (iOS) is "إنهاء التركيز", and the heading is "اكتملت المهمة" (web: "تم").

## हिन्दी (`hi`)

- `Exit Focus` (iOS): "फ़ोकस से बाहर निकलें" fits, but squeezes the count out of the header on the iPhone SE. Alternative: "फ़ोकस बंद करें".
- `%@ saved to your calendar` (iOS) and `focus_done_saved` (Android): "%@ का समय आपके कैलेंडर में सहेज लिया गया" wraps for times over an hour. Alternative: "%@ का समय कैलेंडर में सहेजा गया".
- Differs from the web on purpose: the heading is "टास्क पूरा हो गया" (web: "हो गया").

## 日本語 (`ja`)

- Heading `Task Done` / `focus_done_title`: "完了" is the web word and also the Done button. Alternative: "タスク完了".
- Differs from the web on purpose: the hint for an empty week says "この週", because it also shows for past and future weeks and "今週" only means the current one. The web (`calendar.emptyWeek`) and the Mac still say "今週".

## 한국어 (`ko`)

- Heading `Task Done` / `focus_done_title`: "완료" is the web word and also the Done button. Alternative: "할 일 완료".

## 简体中文 (`zh-Hans`)

- `calendar_range` (Android): "%1$s – %2$s" follows CLDR for plain dates; CLDR uses 至 for 12-hour times. Alternative: "%1$s至%2$s".
- `Tasks done: %lld of %lld` (iOS, screen reader only): "已完成 %1$lld/%2$lld 个任务" matches Android and the web, but VoiceOver may read "3/5" as a fraction. Alternative: "已完成 %1$lld 个任务，共 %2$lld 个".
- Differs from the web on purpose: the heading is "任务已完成" (web: "完成").

## Checked on iPhone simulators

The language sweep of the iOS app (`SaverUITests/LanguageSweepUITests.swift` on the branch `nachtlauf-sprachen`, plus three screens of a list worked through in focus mode) ran in English, German, Russian and Hindi on an iPhone SE (3rd generation) and an iPhone 17 simulator with iOS 27.0. It was signed out, so the calendar showed its signed-out state, and the screen after a single task was not reached.

- **Russian:** "Выйти из режима фокуса" made the header of focus mode wider than the screen on both phones, with the button and the options cut at the edges and the rest of the screen widened with it. With the short form "Выйти" the header fits again; a second run in Russian, Arabic and Turkish after the change showed the list name, progress bar, count and options in all three on both phones.
- **Hindi and German:** the header fits, but the count next to the progress bar is squeezed to a sliver on the iPhone SE.
- The automatic clipped-text audit reported the same elements in English as in German, Russian and Hindi on the focus mode, list and calendar screens, so it found no clipping caused by the translations. It did not notice the Russian header, which only the screenshots showed.
