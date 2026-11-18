@issue-275
Feature: A Grammar page shows each Word's Grammar line
  /{lang}/grammar/{surah} shows each Ayah's Words whole in the reader's
  Script, each with its Word meaning and, beneath it, its Grammar line, read
  from the Quranic Arabic Corpus (ADR 0064): an Ism's Case, a Fi'l's Aspect
  and Verb form, a Harf's kind, each in English with its Arabic term where it
  has one. The Grammar line and an underline beneath the Word are drawn in its
  Part of speech colour, one for each of Ism, Fi'l and Harf, with a light and
  a dark value; the Arabic letters stay the ink. Arabic and Word meanings are
  read from QUL's sources, never typed.

  @AC-4
  Scenario Outline: The Grammar page of Al-Fatihah in the <theme> theme gives an Ism, a Fi'l and a Harf their Grammar lines, coloured by Part of speech
    Given the system colour scheme is <theme>
    When I open the Grammar page of Surah 1 in English
    Then the page is found
    And the page is titled "1. Al-Fatihah · Grammar · Saaliheen"
    And Word 1:2:3 shows its Uthmani text and its English Word meaning from QUL
    And Word 1:2:3's Grammar line reads "Genitive · مَجْرُور", drawn in the Ism colour, as is the underline beneath its Arabic
    And Word 1:5:4's Grammar line reads "Imperfect · Form X", drawn in the Fi'l colour, as is the underline beneath its Arabic
    And Word 1:7:4's Grammar line reads "Preposition · حَرْف جَرّ", drawn in the Harf colour, as is the underline beneath its Arabic
    And the Ism, Fi'l and Harf colours are three, each keeping 4.5:1 on the <theme> paper
    And every Word's Arabic letters are drawn in the ink
    And the page is captured as the evidence screen "issue-275-grammar-1-en-<theme>-desktop"

    Examples:
      | theme |
      | light |
      | dark  |

  @AC-4
  Scenario: The Grammar page in Urdu gives the Word meanings in Urdu, its interface still English
    When I open the Grammar page of Surah 1 in Urdu
    Then the page is found
    And Word 1:2:3 shows its Uthmani text and its Urdu Word meaning from QUL
    And Word 1:2:3's Grammar line reads "Genitive · مَجْرُور", drawn in the Ism colour, as is the underline beneath its Arabic

  @AC-4
  Scenario: A Grammar page in the Indo-Pak Script shows each Word in Indo-Pak
    Given I open Surah 1 in English
    And I choose the Indo-Pak Script
    When I open the Grammar page of Surah 1 in English
    Then Word 1:2:3 shows its Indo-Pak text from QUL

  @AC-4 @issue-276 @AC-3
  Scenario: A Word the Corpus divides differently says it has no Word grammar
    When I open the Grammar page of Surah 2 in English
    Then the page is found
    And Word 2:181:3 shows its Uthmani text and its English Word meaning from QUL
    And Word 2:181:3 says it has no Word grammar, with no underline beneath its Arabic

  @AC-4
  Scenario: A Grammar page of no Surah is not found
    When I open the Grammar page of Surah 115 in English
    Then the page is not found
