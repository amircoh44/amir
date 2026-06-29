#!/usr/bin/env bash
# Build the self-contained standalone HTML by inlining the canonical CSS + JS.
# Run from anywhere:  bash schlage-master-key/build.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSS="$DIR/app/schlage-master-key.css"
JS="$DIR/app/schlage-master-key.js"
OUT="$DIR/schlage-master-key.html"

{
  cat <<'HTML_HEAD'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Schlage Master Key System Designer</title>
<!--
  SELF-CONTAINED build. Everything below is inlined so this file can be pasted
  directly into an Elementor "HTML" widget (or opened on its own). The only
  external dependencies are the jsPDF + autotable CDN scripts, which the page
  loads itself. To embed in Elementor: copy from <style> through </script> at
  the bottom (or paste this whole <body> block) into an HTML widget.

  Canonical sources live in app/schlage-master-key.css and app/schlage-master-key.js.
  Regenerate this file with:  bash schlage-master-key/build.sh
-->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<style>
HTML_HEAD

  cat "$CSS"

  cat <<'HTML_MID'
</style>
</head>
<body>
<div id="smk-app"></div>
<script>
HTML_MID

  cat "$JS"

  cat <<'HTML_TAIL'
</script>
</body>
</html>
HTML_TAIL
} > "$OUT"

echo "Built $OUT ($(wc -c < "$OUT") bytes)"
