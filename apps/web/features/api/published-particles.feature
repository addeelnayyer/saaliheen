@issue-249
Feature: /data/v1 publishes each particle's file beside the Root files
  Each particle (CONTEXT.md) has its own file, /data/v1/particles/<number>.json,
  beside the Root files (ADR 0008), and the Particle dialog's /particles/<number>.json:
  its kind, text, occurrence count and Spellings, with their meanings and Word
  locations, read from Neon. The manifest's dataset version covers every
  particle file. Each Surah file and Surah part carries each rootless Word's
  particle next to its Root tag, a field added to v1, so app builds that
  predate it keep reading their files. The app's Known words page (#255) lists
  every particle from /data/v1/particles.json, as the website's lists them
  from Neon (#251).

  These scenarios fetch the files over HTTP from the production build served
  against the run's own Postgres (features/api/serve-api.ts) and hold them to
  what the dataset builder makes of the committed sources.

  @AC-2
  Scenario: Every particle file is the builder's particle
    When a client fetches /data/v1/particles/<number>.json for each of the builder's 352 particles
    Then each answers 200 with JSON
    And each particle file's bytes are the builder's particle, published as JSON

  @AC-2
  Scenario: The Particle dialog's file for each particle is the builder's particle
    When a client fetches /particles/<number>.json for each of the builder's 352 particles
    Then each answers 200 with JSON
    And each particle file's bytes are the builder's particle, published as JSON

  @AC-2
  Scenario: The manifest's dataset version covers the particle files
    When a client fetches "/data/v1/manifest.json"
    Then it answers 200 with JSON
    And the dataset version is the hash over the Surah index, Surah files, Recitation files and Juz file served, the committed Roots and the particle files served, last

  @AC-2
  Scenario Outline: <address> names no particle, and is not found
    When a client fetches "<address>"
    Then it answers 404

    Examples:
      | address                      |
      | /data/v1/particles/0.json    |
      | /data/v1/particles/01.json   |
      | /data/v1/particles/353.json  |
      | /data/v1/particles/one.json  |
      | /particles/0.json            |
      | /particles/01.json           |
      | /particles/353.json          |

  @AC-2
  Scenario: A particle file is served with a long CDN cache lifetime
    When a client fetches "/data/v1/particles/1.json"
    Then it answers 200 with JSON
    And it tells a CDN to keep it for at least a day

  @issue-255
  Scenario: The particle list lists every particle, with its Spellings' meanings
    When a client fetches "/data/v1/particles.json"
    Then it answers 200 with JSON
    And it lists the builder's 352 particles by number, each with its kind, text, Indo-Pak text and its Spellings' meanings in each Language, most frequent first, empty and repeated ones left out
    And it tells a CDN to keep it for at least a day

  @AC-3
  Scenario: Each Surah file carries each rootless Word's particle next to its Root tag
    When a client fetches each Surah file the manifest lists
    Then every Word with no Root carries its particle's number, kind, text and Indo-Pak text, as the builder gives it, right after its Root tag
    And no Word with a Root carries a particle

  @AC-3
  Scenario Outline: A Surah part in <Language> carries each rootless Word's particle
    When a client fetches part 1 of Surah 1 in <Language>
    Then it answers 200 with JSON
    And every Word with no Root carries its particle, as the builder gives it, right after its Root tag

    Examples:
      | Language |
      | Urdu     |
      | English  |
