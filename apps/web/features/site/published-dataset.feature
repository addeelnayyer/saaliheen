Feature: The dataset published as versioned static files
  Any client, not only the website, reads the whole dataset as static files
  under `/data/v1` (ADR 0008), the Surah index, Surah files and manifest read
  from Neon (the Quran as the import loads it, ADR 0049, with each Ayah's
  Themes, ADR 0040) and the Root files from the committed dataset, all
  cacheable by a CDN: the Surah index, one file per Surah and one
  file per Root, and a manifest that lists every Surah file with the hash of
  its content, the dataset's version and the minimum app version still
  supported. Inside v1 the shapes only ever gain fields, so these contracts
  name the fields each file must have and allow any others.

  In a shape, a type name stands for a value: "string", "number", "boolean",
  "sha256" (64 hex digits) or "version" (like 1.0.0); [shape] is a non-empty
  array of that shape; {"oneOf": [...]} is any of those shapes; and null is null.

  @AC-65-1 @AC-65-3
  Scenario: The Surah index lists all 114 Surahs as the committed dataset does
    When a client fetches "/data/v1/surahs.json"
    Then it answers with status 200, a JSON content type and a CDN-cacheable response
    And the file has this shape:
      """
      [{ "number": "number", "nameArabic": "string", "nameLatin": "string",
         "revelationPlace": "string", "ayahCount": "number", "bismillah": "boolean" }]
      """
    And the file is data/generated/surahs.json as last committed, which lists 114 Surahs

  @AC-65-2 @AC-65-3
  Scenario: The manifest names every Surah file's hash, the dataset version and the minimum app version
    When a client fetches "/data/v1/manifest.json"
    Then it answers with status 200, a JSON content type and a CDN-cacheable response
    And the file has this shape:
      """
      { "datasetVersion": "sha256", "minAppVersion": "version",
        "surahs": [{ "number": "number", "url": "string", "hash": "sha256" }] }
      """
    And the manifest lists Surahs 1 to 114 in order, each at "/data/v1/surahs/<n>.json"
    And the manifest's minimum app version is "1.0.0"

  @AC-65-1 @AC-65-2 @AC-65-3
  Scenario: Every Surah file answers at its manifest address with the content its hash names
    When a client fetches "/data/v1/manifest.json"
    Then every Surah file in the manifest answers with status 200, a JSON content type and a CDN-cacheable response
    And the SHA-256 of each Surah file's bytes is its hash in the manifest
    And each Surah file is its file in data/generated/surahs/ as last committed, each Ayah's Themes those Neon holds
    And every Surah file has this shape:
      """
      { "number": "number", "nameArabic": "string", "nameLatin": "string",
        "revelationPlace": "string", "ayahCount": "number", "bismillah": "boolean",
        "passages": [{ "from": "number", "till": "number", "en": "string", "ur": "string" }],
        "ayahs": [{ "number": "number", "indopakEnd": "string",
                    "translation": { "ur": "string", "en": "string" },
                    "words": [{ "location": "string", "uthmani": "string", "indopak": "string",
                                "meaning": { "ur": "string", "en": "string" },
                                "root": { "oneOf": [null, { "id": "number", "letters": "string" }] } }] }] }
      """

  @AC-65-1 @AC-65-3
  Scenario: A Root file holds its Root's Lemmas and Spellings
    When a client fetches "/data/v1/roots/1356.json"
    Then it answers with status 200, a JSON content type and a CDN-cacheable response
    And the file has this shape:
      """
      { "id": "number", "letters": "string", "transliteration": "string",
        "occurrences": "number", "uniqueWords": "number",
        "lemmas": [{ "id": { "oneOf": ["number", null] }, "text": { "oneOf": ["string", null] },
                     "occurrences": "number", "meaning": { "ur": "string", "en": "string" },
                     "spellings": [{ "uthmani": "string", "indopak": "string",
                                     "meaning": { "ur": "string", "en": "string" },
                                     "locations": ["string"] }] }] }
      """
    And the file is data/generated/roots/1356.json as last committed

  @AC-65-1
  Scenario: Every Root in QUL's word root database is published as its own file
    Then every Root id in QUL's word root database answers at "/data/v1/roots/<id>.json" with status 200, a JSON content type and its committed file
    And these addresses are not found:
      | /data/v1/surahs/0.json   |
      | /data/v1/surahs/115.json |
      | /data/v1/surahs/1        |
      | /data/v1/surahs/001.json |
      | /data/v1/roots/0.json    |
      | /data/v1/roots/1356      |
      | /data/v1/manifest        |
      | /data/v2/manifest.json   |
