// What the app's screens are given from outside its code (#72): the origin it
// reads /data/v1 from, its release switches, this device's storage, the files
// it keeps downloaded Surahs in and its own version (#73).
//
// The origin is app config, never written here: `extra.dataOrigin` in app.json,
// or EXPO_PUBLIC_DATA_ORIGIN when set (a local website on the simulator's host).

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import type { DeviceFiles, DeviceStorage } from "./quran-analysis";
import { buildVersion, configuredOrigin, passageHeadingsOn, tafsirOn } from "./release";

/** The origin the app reads /data/v1 from, without a trailing slash. */
export const dataOrigin = (): string => configuredOrigin(process.env.EXPO_PUBLIC_DATA_ORIGIN, Constants.expoConfig?.extra);

/** Whether this build shows Passage headings: EXPO_PUBLIC_PASSAGE_HEADINGS, else `extra.passageHeadings` in app.json, set to "on". */
export const passageHeadings = (): boolean =>
  passageHeadingsOn(process.env.EXPO_PUBLIC_PASSAGE_HEADINGS, Constants.expoConfig?.extra);

/** Whether this build shows the Tafsir (#236): EXPO_PUBLIC_TAFSIR, else `extra.tafsir` in app.json, set to "on". */
export const tafsir = (): boolean => tafsirOn(process.env.EXPO_PUBLIC_TAFSIR, Constants.expoConfig?.extra);

/** This device's storage: AsyncStorage, kept on the phone and never sent anywhere. */
export const deviceStorage: DeviceStorage = AsyncStorage;

/** Where the app keeps downloaded /data/v1 files: a folder in its document directory, which the system does not clear. */
const KEPT = ["data", "v1"];

/** The kept file `name` ("surahs/18.json"), under KEPT. */
const keptFile = (name: string) => new File(Paths.document, ...KEPT, name);

/** This device's downloaded files (#73): text files in the app's document directory, kept on the phone and never sent anywhere. */
export const deviceFiles: DeviceFiles = {
  async read(name) {
    const file = keptFile(name);
    return file.exists ? file.text() : null;
  },
  async write(name, body) {
    const file = keptFile(name);
    file.parentDirectory.create({ intermediates: true, idempotent: true });
    file.write(body);
  },
};

/** This build's version: app.json's `version`, compared with the manifest's minAppVersion. */
export const appVersion = (): string => buildVersion(Constants.expoConfig);
