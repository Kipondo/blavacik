#!/bin/bash
# Vygeneruje assets/postavy/dodo.glb (Ďoďo: telo, šatník, vlasy, animácie).
# Potrebné: Python 3.13 s balíčkami bpy, numpy, scipy, pillow; MakeHuman dáta z mpfb2 (CC0); Node.js (gltfpack cez npx).
#   uv venv -p 3.13 .venv && . .venv/bin/activate && uv pip install bpy numpy scipy pillow
#   git clone --depth 1 https://github.com/makehumancommunity/mpfb2 /tmp/mpfb2
#   MPFB_DATA=/tmp/mpfb2/src/mpfb/data tools/postava/postav.sh
set -e
TU="$(cd "$(dirname "$0")" && pwd)"
KOREN="$(cd "$TU/../.." && pwd)"
TMP="${TMPDIR:-/tmp}/postava-build"
mkdir -p "$TMP"
python "$TU/build.py" "$TMP/dodo.glb"
# kompresia geometrie (meshopt) – v hre ju rozbalí vendor/three/addons/libs/meshopt_decoder.module.js
npx --yes gltfpack -i "$TMP/dodo.glb" -o "$KOREN/assets/postavy/dodo.glb" -cc -kn -km -ke
ls -la "$KOREN/assets/postavy/dodo.glb"
