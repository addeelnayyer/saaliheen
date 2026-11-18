// The Reading places in the mobile app (#74): this device's ten most recent
// Reading places, one per Surah, newest first, by the shared rules of
// @saaliheen/reading-places, kept in the given DeviceStorage and never sent
// anywhere. The Surah index offers to continue each; a Surah screen opens at
// its Surah's Reading place and moves it to the Ayah at the top of the screen
// whenever scrolling stops, unless the screen is a look-up (opened at a Word
// location, or a Word location in it was followed from a Root dialog). This
// module imports nothing from React Native or Expo, so the app's scenarios
// (features/reading-places.feature) run it in Node.

import {
  parseReadingPlaces,
  readingPlaceIn,
  recordRead,
  writeReadingPlaces,
  type ReadingPlace,
  type TimedReadingPlace,
} from "@saaliheen/reading-places";
import type { DeviceStorage } from "./quran-analysis";

export type { ReadingPlace };

/** The key the Reading places are saved under, as on the website. */
const READING_PLACES = "qwt-reading-places";

/** One Surah screen, from its opening until another Surah screen opens. */
export interface SurahVisit {
  readonly surah: number;
  /** The Ayah at the top of the screen as it opens: a look-up's Word's Ayah, else the Surah's Reading place, else Ayah 1. */
  readonly opensAt: number;
  /** Whether the screen is a look-up, which never moves the Reading place: opened at a Word location, or one was followed in it. */
  readonly lookingUp: boolean;
  /** Scrolling stopped with Ayah `ayah` at the top of the screen: moves the Surah's Reading place there, unless a look-up. */
  scrolledTo(ayah: number): Promise<void>;
  /** A Word location in this Surah ("18:10:3") was followed from a Root dialog: the screen is a look-up from then on. */
  wentTo(location: string): Promise<void>;
}

export interface DeviceReadingPlaces {
  /** This device's Reading places, newest first, as the Surah index offers them to continue. */
  list(): Promise<ReadingPlace[]>;
  /**
   * Opens Surah `surah`'s screen: from the Surah index or a Reading place it
   * opens at the Reading place and records reading there (bringing it to the
   * top); with `ayah` (a Juz's first Ayah, #193) it opens at that Ayah and
   * records reading there; with `word` (a Word location from a Root dialog) it
   * is a look-up.
   */
  open(surah: number, options?: { word?: string; ayah?: number }): Promise<SurahVisit>;
}

/** The Ayah a Word location ("18:10:3") is in. */
const ayahOf = (location: string) => Number(location.split(":")[1]);

/** This device's Reading places, kept in `device`. */
export function openReadingPlaces(device: DeviceStorage): DeviceReadingPlaces {
  const saved = async () => parseReadingPlaces(await device.getItem(READING_PLACES));
  const record = (places: TimedReadingPlace[], place: ReadingPlace) =>
    device.setItem(READING_PLACES, writeReadingPlaces(recordRead(places, place, Date.now())));

  return {
    list: async () => (await saved()).map(({ surah, ayah }) => ({ surah, ayah })),
    async open(surah, { word, ayah } = {}) {
      let opensAt: number;
      if (word === undefined) {
        const places = await saved();
        opensAt = ayah ?? readingPlaceIn(places, surah)?.ayah ?? 1;
        await record(places, { surah, ayah: opensAt });
      } else opensAt = ayahOf(word);
      const visit = {
        surah,
        opensAt,
        lookingUp: word !== undefined,
        async scrolledTo(ayah: number) {
          if (!visit.lookingUp) await record(await saved(), { surah, ayah });
        },
        async wentTo() {
          visit.lookingUp = true;
        },
      };
      return visit;
    },
  };
}
