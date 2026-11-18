// `node features/site/serve-fake-llm.ts`: the site tests' OpenAI and Claude
// (#78), served at ./fake-llm.ts's addresses until the run stops them, so the
// production build answers Quran Chat's questions through them.
// playwright.config.ts's first web server runs this. The site tests' index is
// empty (./start-test-database.ts), so Claude is sent no sources: the
// scenarios read the fake's FIXED_ANSWERS.

import { serveFakeAnthropic } from "../api/fake-anthropic.ts";
import { serveFakeOpenAi } from "../api/fake-openai.ts";
import { fakeLlmAddresses } from "./fake-llm.ts";

const { openAiPort, anthropicPort, openAiBaseUrl, anthropicBaseUrl } = fakeLlmAddresses(Number(process.env.PORT));
await serveFakeOpenAi(openAiPort);
await serveFakeAnthropic(anthropicPort);
console.log(`fake-llm: OpenAI at ${openAiBaseUrl}, Claude at ${anthropicBaseUrl}`);
