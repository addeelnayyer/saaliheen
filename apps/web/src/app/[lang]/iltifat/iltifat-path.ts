// The Iltifat pages' addresses (#138): `/<lang>/iltifat` and
// `/<lang>/iltifat/<direction>`, the same in both Languages apart from the
// Language, and an Iltifat's own fragment on its direction page.

import type { Language } from "@/dataset/reader";
import type { IltifatDirection } from "@/iltifat/iltifat";

/** The overview's address without the Language, as the site bar takes it. */
export const ILTIFAT_ADDRESS = "/iltifat";

/** A direction page's address without the Language, as the site bar takes it. */
export const directionAddress = (direction: IltifatDirection) => `${ILTIFAT_ADDRESS}/${direction}`;

export const iltifatPath = (lang: Language) => `/${lang}${ILTIFAT_ADDRESS}`;

/** The overview's Link preview picture (#144), a Route Handler under the overview; no direction may take its name. */
export const overviewPicturePath = (lang: Language) => `${iltifatPath(lang)}/link-preview-picture`;

export const directionPath = (lang: Language, direction: IltifatDirection) => `/${lang}${directionAddress(direction)}`;

/** The element id, and so the fragment, of an Iltifat on its direction page. */
export const iltifatFragment = (id: number) => `iltifat-${id}`;
