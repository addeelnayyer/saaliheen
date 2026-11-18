// The reader's Language on this device (#192): kept under the website's key,
// qwt-language, Urdu until the reader chooses English. ReaderProvider and Me
// both read and keep it here. This module imports nothing from React Native or
// Expo, so the app's scenarios run it in Node.

import { LANGUAGES as IN_ORDER } from "@saaliheen/passages";
import type { DeviceStorage, Language } from "./quran-analysis";

/** The key the Language is kept under, as on the website. */
const STORED_AS = "qwt-language";

/** Each Language's name in itself, as the Language choice shows it. */
const LANGUAGE_NAME: Record<Language, string> = { ur: "اردو", en: "English" };

/** The Languages a reader chooses between, with their names. */
export const LANGUAGES: [Language, string][] = IN_ORDER.map((language) => [language, LANGUAGE_NAME[language]]);

/** The Language kept on `device`, Urdu when none is. */
export async function storedLanguage(device: DeviceStorage): Promise<Language> {
  return (await device.getItem(STORED_AS)) === "en" ? "en" : "ur";
}

/** Keeps `language` on `device`. */
export function keepLanguage(device: DeviceStorage, language: Language): Promise<void> {
  return device.setItem(STORED_AS, language);
}
