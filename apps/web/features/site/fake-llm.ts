// Where the site tests' OpenAI and Claude answer (#78): the fakes the API
// contract runs against (../api/fake-openai.ts, ../api/fake-anthropic.ts), on
// ports derived from the run's PORT. ./serve-fake-llm.ts serves them, and
// playwright.config.ts names them to the site.

/** Where the fakes of the run serving on `sitePort` answer (3066 → OpenAI on 43066, Claude on 33066). */
export function fakeLlmAddresses(sitePort: number) {
  const offset = sitePort % 10_000;
  const [openAiPort, anthropicPort] = [40_000 + offset, 30_000 + offset];
  return {
    openAiPort,
    anthropicPort,
    openAiBaseUrl: `http://127.0.0.1:${openAiPort}/v1`,
    anthropicBaseUrl: `http://127.0.0.1:${anthropicPort}`,
  };
}
