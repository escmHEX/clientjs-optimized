# Font detection optimization

This fork starts from upstream ClientJS 0.2.1, commit
`8f98834b19440cb6bc96048d23b8886d4e32dddc`.
Its first local version is `0.2.1-optimized.1`.

Only font-list measurement changes. `src/vendor/fontdetect.js` adds `detectMany`:
insert all font spans together, read their dimensions, then remove them.
The original generic baseline measurements and `detect(font)` remain unchanged.
`src/client.base.js` selects batching on Blink only. Other engines keep sequential
probing. Cold Firefox font enumeration was unstable even when comparing upstream
with itself, so batching is not enabled there.

The font list and its order, measurement text and size, comparison rules, output
format (including its original trailing delimiter), and fingerprint hash remain
unchanged. The call stays synchronous, with no persistent result cache or delay.

## Build and validation

Use the committed package lock. Do not update dependencies as part of this patch.

```sh
npm ci --ignore-scripts
npm run checks
```

The inherited Webpack 4 build needs `NODE_OPTIONS=--openssl-legacy-provider` with
Node 22. In PowerShell, set `$env:NODE_OPTIONS='--openssl-legacy-provider'` for
the build/test process. Set `CHROME_BIN` if Chrome is not discovered automatically.
No source code or runtime dependency upgrade is needed for this build setting.

`npm test` runs the focused font tests and the headless Chrome suite. The inherited
interactive and remote suites remain explicit opt-in commands (`test:local` and
`test:aircover`); a normal validation run does not require those services.

The existing Karma suite covers all four library variants. The focused Node test
checks matching width/height results, output order, node cleanup, and layout-read
grouping. The browser spec compares font lists and fingerprints after fonts load.
Cold-start equivalence and performance must also be measured in the consuming
page before accepting a release; unit tests alone cannot prove those properties.

## AgarCity consumption

AgarCity vendors the full `dist/client.min.js` build, its source map, and the
Apache license with SHA-256 checksums. It copies these bytes during its normal
asset release, without editing bundled library code. Keep code changes and tests
in this fork. For each subsequent release, increment the fork version, rebuild,
update the consumer's checksum manifest and immutable asset URL, and record the
published fork commit after commit/push are authorized.
