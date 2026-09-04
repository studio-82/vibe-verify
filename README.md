# Vibe Verify site

Static product site and Sparkle appcast host for `vibeverify.s82.studio`.

Replace the disabled checkout buttons with the live Lemon Squeezy checkout URL after the store and Vibe Verify product are approved.

## Publishing a Vibe Verify update

1. In Xcode, increment **Version** and **Build** before archiving.
2. Archive and export a Developer ID signed, notarized `Vibe Verify.app`, then ZIP the app bundle while preserving its metadata.
3. Run `./scripts/publish-sparkle-update.sh /absolute/path/to/Vibe-Verify-version.zip` from this directory.
4. Commit and push the new file in `releases/` plus the generated `appcast.xml`.

The script signs each appcast entry using the private Sparkle key stored in this Mac's login keychain under `studio.s82.vibeverify`. Never commit or export that private key.
