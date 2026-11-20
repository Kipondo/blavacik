#!/bin/bash
# Vygeneruje NPC postavy z data/postavy/npc.json do assets/postavy/npc/<model>.glb.
# Potrebné to isté ako pre Ďoďa (pozri postav.sh): Python 3.13 + bpy, numpy, scipy, pillow; MPFB_DATA; Node.js.
#   MPFB_DATA=/tmp/mpfb2/src/mpfb/data tools/postava/npc.sh [model …]
set -e
TU="$(cd "$(dirname "$0")" && pwd)"
KOREN="$(cd "$TU/../.." && pwd)"
TMP="${TMPDIR:-/tmp}/npc-build"
mkdir -p "$TMP" "$KOREN/assets/postavy/npc"
python "$TU/npc.py" "$TMP" "$@"
for f in "$TMP"/*.raw.glb; do
  meno="$(basename "$f" .raw.glb)"
  if [ "$#" -gt 0 ] && [[ ! " $* " =~ " $meno " ]]; then continue; fi
  npx --yes gltfpack -i "$f" -o "$KOREN/assets/postavy/npc/$meno.glb" -cc -kn -km -ke
done
ls -la "$KOREN/assets/postavy/npc/"
