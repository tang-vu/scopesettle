# ScopeSettle judge video

This folder contains the reproducible 90-second submission video package.

- `voice-segments.json`: fixed English narration and scene timing.
- `subtitles.en.srt`: accessible subtitle sidecar.
- `overlay.ass`: burned-in scene labels and captions.
- `assets/`: public product, report, explorer, Mainnet, and repository captures.
- `output/`: rendered previews and final exports; generated media is intentionally ignored.

Generate narration only with a Xiaomi MiMo **Pay-As-You-Go API key**:

```powershell
Copy-Item .env.video.example .env.video.local
# Put the Pay-As-You-Go key in .env.video.local, which Git ignores.
pnpm video:voice
pnpm video:render
```

The audio generator refuses Token Plan endpoints because that plan explicitly prohibits automated
script and application-backend usage. It uses `mimo-v2.5-tts-voicedesign`, then transcribes each
segment with `mimo-v2.5-asr` for a QA transcript. No submitted repository code is executed.

Run `pnpm video:render` without audio to create a silent motion preview. The final MP4 is H.264,
1920x1080, 30 fps, with AAC audio and burned-in English captions.
