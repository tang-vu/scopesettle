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

This uses an installed Windows speech voice and fails if any generated segment exceeds its declared
scene duration. V2 audio is written to `audio-v2/`; the original MiMo narration remains in `audio/`
for provenance but is not used by the V2 renderer.

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
