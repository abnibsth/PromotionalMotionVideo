#!/bin/sh
# Concatenate rendered segments, mux audio, export master/web, build contact sheet, verify.
set -e
cd "$(dirname "$0")"
F=${FFMPEG:-/tmp/r/node_modules/.pnpm/ffmpeg-static@5.3.0/node_modules/ffmpeg-static/ffmpeg}
mkdir -p deliverables
printf "file 'seg_a.mp4'\nfile 'seg_b.mp4'\nfile 'seg_c.mp4'\n" > out/list.txt
$F -loglevel error -y -f concat -safe 0 -i out/list.txt -c copy out/video.mp4
# master: lossless-ish video copy (CRF 12), AAC 320k
$F -loglevel error -y -i out/video.mp4 -i out/score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -t 30 -movflags +faststart deliverables/bpg-motion-master.mp4
# web: re-encode for streaming
$F -loglevel error -y -i out/video.mp4 -i out/score.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 21 -maxrate 8M -bufsize 16M -profile:v high -pix_fmt yuv420p -g 120 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 160k -ar 48000 -t 30 -movflags +faststart deliverables/bpg-motion-web.mp4
# contact sheet: 24 frames, every 1.25 s
$F -loglevel error -y -i out/video.mp4 -vf "fps=0.8,scale=480:270,tile=4x6:padding=6:color=0x101219" -frames:v 1 deliverables/bpg-motion-contact-sheet.png
FP=$(dirname "$F")/ffprobe
for f in deliverables/*.mp4; do
  echo "== $f"; $F -hide_banner -i "$f" 2>&1 | grep -E "Duration|Stream" || true
  $F -hide_banner -i "$f" -map 0:v -c copy -f null - 2>&1 | grep -oE "frame= *[0-9]+" | tail -n 1
done
$F -hide_banner -i deliverables/bpg-motion-master.mp4 -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -n 2
mkdir -p ../public/bpg && cp deliverables/* ../public/bpg/
