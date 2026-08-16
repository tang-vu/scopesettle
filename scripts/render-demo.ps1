$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$assetRoot = Join-Path $repositoryRoot "video\assets"
$audioRoot = Join-Path $repositoryRoot "video\audio"
$outputRoot = Join-Path $repositoryRoot "video\output"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$scenes = @(
  @{ File = "judge-proof.png"; Duration = "11.6" },
  @{ File = "live-home.png"; Duration = "11.6" },
  @{ File = "job-top.png"; Duration = "12.6" },
  @{ File = "job-decision.png"; Duration = "13.6" },
  @{ File = "job-evidence.png"; Duration = "13.6" },
  @{ File = "refund-tx.png"; Duration = "12.6" },
  @{ File = "mainnet-contract.png"; Duration = "10.6" },
  @{ File = "github-repo.png"; Duration = "8.0" }
)

$arguments = @("-y")
foreach ($scene in $scenes) {
  $path = Join-Path $assetRoot $scene.File
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing scene asset: $path" }
  $arguments += @("-loop", "1", "-framerate", "30", "-t", $scene.Duration, "-i", $path)
}
$arguments += @(
  "-f", "lavfi", "-t", "90", "-i",
  "aevalsrc=0.12*sin(2*PI*55*t)+0.06*sin(2*PI*82.41*t)+0.04*sin(2*PI*110*t):s=48000:d=90"
)

$voiceFiles = 1..8 | ForEach-Object { Join-Path $audioRoot ("{0:D2}.wav" -f $_) }
$hasVoice = ($voiceFiles | Where-Object { -not (Test-Path -LiteralPath $_) }).Count -eq 0
if ($hasVoice) {
  foreach ($voiceFile in $voiceFiles) { $arguments += @("-i", $voiceFile) }
}

$motion = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080," +
  "zoompan=z='min(1.035,1+on*0.00003)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,setsar=1"
$filters = @()
for ($index = 0; $index -lt $scenes.Count; $index++) {
  $filters += "[$index`:v]$motion[v$index]"
}
$filters += "[v0][v1]xfade=transition=fade:duration=0.6:offset=11.0[x1]"
$filters += "[x1][v2]xfade=transition=fade:duration=0.6:offset=22.0[x2]"
$filters += "[x2][v3]xfade=transition=fade:duration=0.6:offset=34.0[x3]"
$filters += "[x3][v4]xfade=transition=fade:duration=0.6:offset=47.0[x4]"
$filters += "[x4][v5]xfade=transition=fade:duration=0.6:offset=60.0[x5]"
$filters += "[x5][v6]xfade=transition=fade:duration=0.6:offset=72.0[x6]"
$filters += "[x6][v7]xfade=transition=fade:duration=0.6:offset=82.0,ass=video/overlay.ass[vout]"
$filters += "[8:a]lowpass=f=900,tremolo=f=0.1:d=0.35,volume=0.055,afade=t=in:st=0:d=2,afade=t=out:st=87:d=3[music]"

if ($hasVoice) {
  $starts = @(700, 11000, 22000, 34000, 47000, 60000, 72000, 82000)
  $voiceLabels = @()
  for ($index = 0; $index -lt $voiceFiles.Count; $index++) {
    $inputIndex = 9 + $index
    $filters += "[$inputIndex`:a]adelay=$($starts[$index])|$($starts[$index]),volume=1.0[voice$index]"
    $voiceLabels += "[voice$index]"
  }
  $filters += "$($voiceLabels -join '')amix=inputs=8:duration=longest:normalize=0[voice]"
  $filters += "[music][voice]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[aout]"
  $output = Join-Path $repositoryRoot "docs\assets\scopesettle-demo.mp4"
} else {
  $filters += "[music]loudnorm=I=-23:TP=-2:LRA=7[aout]"
  $output = Join-Path $outputRoot "scopesettle-demo-preview.mp4"
}

$arguments += @(
  "-filter_complex", ($filters -join ";"),
  "-map", "[vout]", "-map", "[aout]", "-t", "90",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", $output
)

Push-Location $repositoryRoot
try {
  & ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg exited with code $LASTEXITCODE" }
} finally {
  Pop-Location
}

Write-Output "Rendered $output"
