$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Speech

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$segmentsPath = Join-Path $repositoryRoot "video\voice-segments.json"
$outputRoot = Join-Path $repositoryRoot "video\audio-v2"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$segments = Get-Content -LiteralPath $segmentsPath -Raw | ConvertFrom-Json
$availableVoices = [System.Speech.Synthesis.SpeechSynthesizer]::new().GetInstalledVoices()
$preferredVoice = $availableVoices |
  Where-Object { $_.Enabled -and $_.VoiceInfo.Name -eq "Microsoft David Desktop" } |
  Select-Object -First 1
if (-not $preferredVoice) {
  $preferredVoice = $availableVoices | Where-Object { $_.Enabled } | Select-Object -First 1
}
if (-not $preferredVoice) { throw "No enabled Windows speech synthesis voice is installed." }

foreach ($segment in $segments) {
  $outputPath = Join-Path $outputRoot "$($segment.id).wav"
  $synthesizer = [System.Speech.Synthesis.SpeechSynthesizer]::new()
  try {
    $synthesizer.SelectVoice($preferredVoice.VoiceInfo.Name)
    $synthesizer.Rate = 1
    $synthesizer.Volume = 100
    $synthesizer.SetOutputToWaveFile($outputPath)
    $synthesizer.Speak([string]$segment.text)
  } finally {
    $synthesizer.Dispose()
  }

  $duration = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $outputPath
  if ($LASTEXITCODE -ne 0) { throw "ffprobe failed for $outputPath" }
  $durationMs = [math]::Round([double]::Parse($duration, [Globalization.CultureInfo]::InvariantCulture) * 1000)
  if ($durationMs -gt [int]$segment.durationMs) {
    throw "Narration $($segment.id) is ${durationMs}ms, over its $($segment.durationMs)ms slot."
  }
  Write-Output "$($segment.id): ${durationMs}ms / $($segment.durationMs)ms using $($preferredVoice.VoiceInfo.Name)"
}
