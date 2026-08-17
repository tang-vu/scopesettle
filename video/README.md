# ScopeSettle judge video

This folder contains the reproducible 90-second submission video package.

- `voice-segments.json`: fixed English narration and scene timing.
- `subtitles.en.srt`: accessible subtitle sidecar.
- `overlay.ass`: burned-in scene labels and captions.
- `assets/`: public product captures plus visibly labelled presentation fixtures.
- `output/`: ignored local previews and QA artifacts.
- `../docs/assets/scopesettle-demo.mp4`: checked-in final submission export.

Generate the checked-in V2 narration without an external credential:

```powershell
pnpm video:voice:local
pnpm video:render
```

This uses Kokoro ONNX through an isolated `uv` environment and fails if any generated segment exceeds
its scene duration or its faster-whisper word error rate exceeds 18%. Models are cached outside the
repository. Passing audio and its ASR report are written to `audio-v3/`.

After rendering, verify that the music and final loudness mix did not reduce speech clarity:

```powershell
pnpm video:qa:audio
```

The original MiMo and Windows narration remain in `audio/` and `audio-v2/` for provenance but are not
used by the current renderer.

The optional MiMo path requires a Xiaomi MiMo **Pay-As-You-Go API key**:

```powershell
Copy-Item .env.video.example .env.video.local
# Put the Pay-As-You-Go key in .env.video.local, which Git ignores.
pnpm video:voice
```

The MiMo generator refuses Token Plan endpoints because that plan explicitly prohibits automated
script and application-backend usage. Never place an exposed key in this repository. No submitted
repository code is executed.

The final MP4 is H.264, 1920x1080, 30 fps, with AAC audio and burned-in English captions. Public
production evidence is captured separately from the visibly labelled developer-console fixture by
`capture-v2.spec.ts`.
