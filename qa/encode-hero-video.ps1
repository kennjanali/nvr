# =============================================================================
# Encode the homepage hero background video.
#
# The hero player is a muted, looping, decorative wallpaper behind a dark
# scrim, which changes what "good quality" means: nobody studies it, half of
# it is covered by the headline, and every byte is paid for on a phone. So
# this trims it short, halves the resolution, throws the audio away, and
# leans on a high CRF. Target is roughly 2 MB.
#
# Local tooling — .htaccess refuses to serve the qa/ folder, so it never
# reaches the site even if it gets uploaded by accident.
#
# Requires a real ffmpeg on PATH (winget install Gyan.FFmpeg).
# Usage:  pwsh -File qa/encode-hero-video.ps1
# =============================================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'assets/video/Natures Village Resort.mp4'
$dst  = Join-Path $root 'assets/video/nvr-hero.mp4'

# --- Knobs -------------------------------------------------------------------
$StartAt  = 5      # seconds trimmed off the front (the old data-hero-video-start)
$Duration = 20     # length of the loop
$Width    = 1280   # 720p is plenty behind a scrim
$Crf      = 26     # 23 = high quality, 28 = visibly soft. 26 suits wallpaper.
# -----------------------------------------------------------------------------

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Error "ffmpeg not found on PATH. Install with: winget install Gyan.FFmpeg"
}
if (-not (Test-Path $src)) { Write-Error "Source not found: $src" }
if (Test-Path $dst) {
  Write-Error "$dst already exists. Delete or rename it first so this can't silently clobber a good encode."
}

$before = (Get-Item $src).Length / 1MB
Write-Output ("source : {0:N1} MB" -f $before)

# -ss BEFORE -i is the fast seek: ffmpeg jumps in the input rather than
#   decoding and discarding the first $StartAt seconds.
# -an          drops the audio track outright. The element is muted; an audio
#              stream is bytes that can never be heard.
# scale=-2     keeps the height even, which H.264 requires.
# +faststart   moves the moov atom to the FRONT. Without it the player fetches
#              the tail to find the metadata, aborts its first request and
#              re-downloads — measured at 68 MB over the wire for a 35 MB file.
# yuv420p      the only pixel format every browser decodes.
ffmpeg -hide_banner -loglevel warning -stats `
  -ss $StartAt -i "$src" -t $Duration `
  -an `
  -vf "scale=${Width}:-2:flags=lanczos,fps=25" `
  -c:v libx264 -profile:v high -preset slow -crf $Crf `
  -pix_fmt yuv420p -g 50 -movflags +faststart `
  "$dst"

if ($LASTEXITCODE -ne 0) { Write-Error "ffmpeg failed with exit code $LASTEXITCODE" }

$after = (Get-Item $dst).Length / 1MB
Write-Output ""
Write-Output ("result : {0:N1} MB  ({1:N0}% smaller)" -f $after, ((1 - $after / $before) * 100))
Write-Output "wrote  : $dst"
Write-Output ""
Write-Output "Now update the hero in index.html:"
Write-Output '  data-hero-video="/assets/video/nvr-hero.mp4"'
Write-Output '  data-hero-video-start="0"      <-- the 5s trim is baked in now'
