// A Passage's Ayahs as its heading writes them, on a Surah page and a Grammar page (#278).

import type { PartPassage } from "@saaliheen/dataset/types";

/** A Passage's Ayahs as its heading writes them: `83–88`, or `88` for one Ayah. */
export const passageRange = ({ from, till }: Pick<PartPassage, "from" | "till">) => (from === till ? `${from}` : `${from}–${till}`);
