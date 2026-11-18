// The content migrations (ADR 0015), in the order they run. Append only: a
// shipped migration is never edited, renamed or removed, because databases
// that have run it will not run it again.

import { auditAllahReferences, createContentAudit } from "./content-audit.ts";
import { createIltifatTable, loadIltifatCatalogue } from "./iltifat.ts";
import { createIltifatMarkedWordTable } from "./iltifat-marked-word.ts";
import { createIltifatRevisionTable } from "./iltifat-revision.ts";
import { createKnownWordTable } from "./known-word.ts";
import type { ContentMigration } from "./migrate.ts";
import { recordPassageRevisionChanges } from "./passage-revision-changes.ts";
import { createPassageTables, loadPassages } from "./passages.ts";
import { createPlanAndAskedQuestion } from "./plan.ts";
import { createQuranChatSourceTable } from "./quran-chat-source.ts";
import { createSupplicationRevisionTables } from "./supplication-revision.ts";
import { createSupplicationSpanTable } from "./supplication-span.ts";
import { letSupplicationRevisionsOutliveTheirRows } from "./supplication-revisions-outlive-rows.ts";
import { createSupplicationTables, loadSupplications } from "./supplications.ts";
import { createTafsirEntryTable } from "./tafsir.ts";
import { createThemeTables, loadThemes } from "./themes.ts";

export const CONTENT_MIGRATIONS: readonly ContentMigration[] = [
  { name: "0001-create-iltifat", run: createIltifatTable },
  { name: "0002-load-iltifat-catalogue-2.0", run: loadIltifatCatalogue },
  { name: "0003-create-iltifat-revision", run: createIltifatRevisionTable },
  { name: "0004-create-iltifat-marked-word", run: createIltifatMarkedWordTable },
  { name: "0005-create-content-audit", run: createContentAudit },
  { name: "0006-audit-allah-references", run: auditAllahReferences },
  { name: "0007-create-theme-tables", run: createThemeTables },
  { name: "0008-load-themes-file", run: loadThemes },
  { name: "0009-create-supplication", run: createSupplicationTables },
  { name: "0010-create-supplication-revision", run: createSupplicationRevisionTables },
  { name: "0011-load-supplications", run: loadSupplications },
  { name: "0012-create-passage-tables", run: createPassageTables },
  { name: "0013-load-passages-and-phrases-files", run: loadPassages },
  { name: "0014-record-passage-revision-changes", run: recordPassageRevisionChanges },
  { name: "0015-let-supplication-revisions-outlive-their-rows", run: letSupplicationRevisionsOutliveTheirRows },
  { name: "0016-create-tafsir-entry", run: createTafsirEntryTable },
  { name: "0017-create-quran-chat-source", run: createQuranChatSourceTable },
  { name: "0018-create-plan-and-asked-question", run: createPlanAndAskedQuestion },
  { name: "0019-create-known-word", run: createKnownWordTable },
  { name: "0020-create-supplication-span", run: createSupplicationSpanTable },
];
