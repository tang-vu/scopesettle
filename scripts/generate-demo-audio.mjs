import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import process from "node:process";
import { fileURLToPath } from "node:url";

const requireFromWeb = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { default: OpenAI } = requireFromWeb("openai");

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const audioDirectory = fileURLToPath(
  new URL("../video/audio/", import.meta.url),
);
const localEnvironment = fileURLToPath(
  new URL("../.env.video.local", import.meta.url),
);
if (existsSync(localEnvironment)) process.loadEnvFile(localEnvironment);
const segments = JSON.parse(
  await readFile(
    new URL("../video/voice-segments.json", import.meta.url),
    "utf8",
  ),
);
const apiKey = process.env.MIMO_API_KEY;
const baseURL = process.env.MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1";

if (!apiKey) {
  throw new Error("Set MIMO_API_KEY to a Pay-As-You-Go Xiaomi MiMo API key.");
}
if (new URL(baseURL).hostname.startsWith("token-plan-")) {
  throw new Error(
    "Token Plan endpoints prohibit automated scripts. Use a Pay-As-You-Go API key and endpoint.",
  );
}

const client = new OpenAI({ apiKey, baseURL });
const voiceDescription = [
  "A polished English male documentary narrator in his early thirties.",
  "Neutral international accent, warm low-mid timbre, precise consonants, and a pristine studio recording.",
  "Confident and measured at roughly 135 words per minute, with subtle cinematic energy.",
  "Sound credible and technical, never exaggerated or salesy.",
].join(" ");

await mkdir(audioDirectory, { recursive: true });
const transcripts = [];

for (const segment of segments) {
  const speech = await client.chat.completions.create({
    model: "mimo-v2.5-tts-voicedesign",
    messages: [
      { role: "user", content: voiceDescription },
      { role: "assistant", content: segment.text },
    ],
    audio: { format: "wav", optimize_text_preview: false },
  });
  const encodedAudio = speech.choices[0]?.message?.audio?.data;
  if (!encodedAudio)
    throw new Error(`MiMo returned no audio for segment ${segment.id}.`);

  const bytes = Buffer.from(encodedAudio, "base64");
  const output = new URL(`../video/audio/${segment.id}.wav`, import.meta.url);
  await writeFile(output, bytes);

  const recognition = await client.chat.completions.create({
    model: "mimo-v2.5-asr",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "input_audio",
            input_audio: {
              data: `data:audio/wav;base64,${bytes.toString("base64")}`,
            },
          },
        ],
      },
    ],
    asr_options: { language: "en" },
  });
  transcripts.push({
    id: segment.id,
    expected: segment.text,
    recognized: recognition.choices[0]?.message?.content ?? "",
  });
  process.stdout.write(`Generated and transcribed segment ${segment.id}.\n`);
}

await writeFile(
  new URL("../video/audio/transcripts.json", import.meta.url),
  `${JSON.stringify({ baseURL, repositoryRoot, transcripts }, null, 2)}\n`,
);
