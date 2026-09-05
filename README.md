# Vibe Viewer site

Static product site and Sparkle appcast host for `vibeverify.s82.studio`.

The landing page uses the Vibe Viewer design direction. The distributed Mac app,
signing identity, update feed, and existing domain are still Vibe Verify.

## Website development

Serve this directory with `python3 -m http.server 4178` and visit
`http://localhost:4178`. No frontend framework or build step is required.
Run `node --test scripts/*.test.mjs` and
`python3 scripts/check-site.py` before publishing. GitHub Pages serves the root
of `main`; push the reviewed changes there to publish.

The light-first design has an optional dark theme. Typography is self-hosted
[Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), under the
included `assets/Manrope-OFL.txt` licence. No runtime font service is used.
The hero animates sampled letter outlines horizontally, keeping the baseline
fixed. A single SVG moves from the smaller stacked hero title into the sticky
header on scroll; the second word unfolds to the right, then rises onto the same
baseline. There is no duplicated nav logo. Reduced-motion and the footer pause
control use a direct position switch instead of animated travel. Wiggle pauses
when docked, offscreen, or in a hidden tab. HTML text is the network/JS fallback.

To rebuild the font and outline assets, install `fonttools[woff]` in a development
environment and run `python3 scripts/build-wordmark.py /path/to/Manrope[wght].ttf`.
This is only needed when changing the wordmark, not for normal deployment.

Replace the disabled checkout buttons with the live Lemon Squeezy checkout URL after the store and Vibe Verify product are approved.

## Publishing a Vibe Verify update

1. In Xcode, increment **Version** and **Build** before archiving.
2. Archive and export a Developer ID signed, notarized `Vibe Verify.app`, then ZIP the app bundle while preserving its metadata.
3. Run `./scripts/publish-sparkle-update.sh /absolute/path/to/Vibe-Verify-version.zip` from this directory.
4. Commit and push the new file in `releases/` plus the generated `appcast.xml`.

The script signs each appcast entry using the private Sparkle key stored in this Mac's login keychain under `studio.s82.vibeverify`. Never commit or export that private key.
