#!/bin/zsh
set -euo pipefail

if [[ $# -ne 1 ]]; then
  print "Usage: $0 /absolute/path/to/Vibe-Verify-version.zip"
  exit 64
fi

archive_path="$1"
if [[ ! -f "$archive_path" ]]; then
  print "Update archive not found: $archive_path"
  exit 66
fi

script_dir="${0:A:h}"
site_dir="${script_dir:h}"
release_dir="${site_dir}/releases"
account_name="studio.s82.vibeverify"
tool_path="${SPARKLE_GENERATE_APPCAST:-}"

if [[ -z "$tool_path" ]]; then
  tool_path=$(find "$HOME/Library/Developer/Xcode/DerivedData" -path '*VibeVerify*/SourcePackages/artifacts/sparkle/Sparkle/bin/generate_appcast' -type f -print -quit)
fi

if [[ -z "$tool_path" || ! -x "$tool_path" ]]; then
  print "Sparkle's generate_appcast tool was not found. Resolve the VibeVerify Xcode package first."
  exit 69
fi

mkdir -p "$release_dir"
cp "$archive_path" "$release_dir/"
"$tool_path" \
  --account "$account_name" \
  --download-url-prefix "https://vibeverify.s82.studio/releases/" \
  --link "https://vibeverify.s82.studio/" \
  -o "${site_dir}/appcast.xml" \
  "$release_dir"

print "Generated ${site_dir}/appcast.xml. Review it, then commit and push Website/."
