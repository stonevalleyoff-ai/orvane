#!/usr/bin/env bash
# Lisière — FILMER LE JEU (jeux/lisiere/outils/film.sh)
# Joue Lisière avec un vrai rendu, sous un écran virtuel, et le filme image par image (le « Movie Maker » de Godot, 30 images par
# seconde : en dessous, la caméra lissée s'envole quand l'essai joue en accéléré). Puis fait une planche-contact de 12 images.
#   jeux/lisiere/outils/film.sh <dossier> -- --vitrine --heure nuit --duree 10
#   jeux/lisiere/outils/film.sh <dossier> -- --essai
# Les images : <dossier>/f00000000.png… ; la planche : <dossier>/planche.png ; une image seule, en grand : <dossier>/f000000NN.png
# Il faut xvfb-run et ImageMagick (montage).
set -euo pipefail
ICI="$(cd "$(dirname "$0")/../../.." && pwd)"
DOSSIER="${1:?un dossier où mettre les images}"
shift
[ "${1:-}" = "--" ] && shift
mkdir -p "$DOSSIER"
rm -f "$DOSSIER"/f*.png "$DOSSIER"/f.wav
cd "$ICI"
xvfb-run -a -s "-screen 0 1280x720x24" outils/godot.sh --path jeux/lisiere --rendering-driver opengl3 \
  --write-movie "$DOSSIER/f.png" --fixed-fps 30 -- "$@" 2>&1 | grep -vE "^\s*$|ALSA|audio_driver|dummy driver|init_output_device|Condition \"status < 0\"" || true
n=$(ls "$DOSSIER"/f0*.png 2>/dev/null | wc -l)
if [ "$n" -lt 2 ]; then echo "film.sh : aucune image" >&2; exit 1; fi
sel=()
for k in $(seq 0 11); do sel+=("$(printf '%s/f%08d.png' "$DOSSIER" $(( (n - 1) * k / 11 )))"); done
montage "${sel[@]}" -tile 3x4 -geometry 640x360+4+4 -background '#222' "$DOSSIER/planche.png"
echo "film.sh : $n images, planche : $DOSSIER/planche.png"
