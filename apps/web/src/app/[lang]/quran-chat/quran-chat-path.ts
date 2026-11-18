// Quran Chat's address (#78): `/<lang>/quran-chat`, the same in both Languages
// apart from the Language.

import type { Language } from "@/dataset/reader";

/** The page's address without the Language, as the site bar takes it. */
export const QURAN_CHAT_ADDRESS = "/quran-chat";

export const quranChatPath = (lang: Language) => `/${lang}${QURAN_CHAT_ADDRESS}`;
