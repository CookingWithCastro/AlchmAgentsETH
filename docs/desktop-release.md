# Desktop release: signing + notarization

Producing a distributable `.dmg` of the Alchm desktop app for macOS
requires a Developer ID signing identity and an Apple notarization
profile. This document covers the one-time setup and the per-release
runbook.

The packaging script that consumes these credentials lives at
[`scripts/package-tauri-macos.sh`](../scripts/package-tauri-macos.sh).
It is invoked automatically by `bun run release:desktop:mac`.

## One-time setup

### 1. Obtain a Developer ID Application certificate

You need an Apple Developer Program membership ($99/yr). Once
enrolled:

1. Visit https://developer.apple.com/account/resources/certificates/list
2. Click the **+** button, choose **Developer ID Application**, follow
   the prompts to upload a Certificate Signing Request from Keychain
   Access (Certificate Assistant → Request a Certificate From a
   Certificate Authority → save to disk).
3. Download the resulting `.cer` and double-click to import into the
   login keychain.

Find your signing identity name:

```bash
security find-identity -p codesigning -v
```

The line you want looks like:

```
1) 1234ABCD56EF... "Developer ID Application: Your Name (TEAM12345)"
```

Copy the _quoted string_ — that's the value for
`ALCHM_MACOS_SIGNING_IDENTITY`.

### 2. Create an App Store Connect API key for notarization

Notarization no longer accepts password auth. You need an App Store
Connect API key:

1. Visit https://appstoreconnect.apple.com/access/api
2. Click **Generate API Key**, choose the **Developer** role
   (notarization-only access is sufficient).
3. Download the `.p8` private key (one-shot download — save it
   immediately) and note the Key ID + Issuer ID shown on the page.

Then register the credentials with `notarytool` so they're addressable
by a profile name:

```bash
xcrun notarytool store-credentials "alchm-notary" \
  --key ~/path/to/AuthKey_KEYID.p8 \
  --key-id KEYID \
  --issuer ISSUER_UUID
```

The profile name `alchm-notary` is what you'll set as
`ALCHM_NOTARY_PROFILE`. The credentials are stored encrypted in the
login keychain; the `.p8` file isn't read again after this command.

### 3. Set the environment variables

The release script reads the signing variables below. The Tauri build also
embeds the desktop account-link signing secret.

| Variable                       | What it is                                                      | Example                                             |
| ------------------------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| `ALCHM_MACOS_SIGNING_IDENTITY` | The quoted identity string from `security find-identity`.       | `"Developer ID Application: Your Name (TEAM12345)"` |
| `ALCHM_NOTARY_PROFILE`         | The profile name passed to `notarytool store-credentials`.      | `alchm-notary`                                      |
| `DEEP_LINK_SHARED_SECRET`      | HMAC secret shared by the Agents web app and the desktop build. | Generate with `openssl rand -hex 32`                |

`DEEP_LINK_SHARED_SECRET` must be identical in the production web deployment
and in the environment that runs `bun run release:desktop:mac`. The web app
uses it to sign the five-minute `alchm://link-account` handoff; Tauri embeds it
at build time and rejects links signed with any other value. The legacy
`TAURI_DEEP_LINK_SECRET` name remains supported as an alias.

Add them to your shell init (`.zshrc` / `.bashrc`) so every release
inherits them automatically. **Do not commit them** — they're machine-
specific and the signing identity in particular is sensitive enough
that scoping it to your user account is the right default.

If `ALCHM_MACOS_SIGNING_IDENTITY` is unset or `-`, the script signs
with an ad-hoc identity. The resulting `.dmg` won't pass Gatekeeper
for end users but is useful for local install testing.

If `ALCHM_NOTARY_PROFILE` is unset, the script skips notarization
(useful for fast iteration during development). The `.dmg` will still
be signed but unstapled — users will hit a one-time
"developer cannot be verified" warning that they can override.

## Per-release runbook

From a clean checkout on `main`:

```bash
# 1. Make sure all sidecars are built for the target arch(es).
#    For Apple Silicon-only release:
bun run build:sidecar

#    For universal Mac DMG (covers Intel + Apple Silicon):
bun run build:sidecar:mac-universal

# 2. Build the Tauri app, sign, and notarize.
#    Also reads DEEP_LINK_SHARED_SECRET for account-link verification.
bun run release:desktop:mac
```

Output lands at:

```
src-tauri/target/release/bundle/dmg/Alchm_1.0.0_aarch64.dmg
```

(Or `*_universal.dmg` if you targeted both arches.)

## Verifying the signed + notarized bundle

```bash
# Signature integrity
codesign --verify --deep --strict --verbose=2 \
  src-tauri/target/release/bundle/macos/Alchm.app

# Notarization stapling (present only after notarization succeeded)
xcrun stapler validate \
  src-tauri/target/release/bundle/dmg/Alchm_1.0.0_aarch64.dmg

# Gatekeeper accepts it
spctl --assess --type install --verbose \
  src-tauri/target/release/bundle/dmg/Alchm_1.0.0_aarch64.dmg
```

All three should report success.

## Troubleshooting

### "errSecInternalComponent" during codesign

Your Developer ID cert isn't trusted by the system keychain. In
Keychain Access, locate the **Developer ID Certification Authority**
under "System Roots" and the **Apple Worldwide Developer Relations
Certification Authority** under "login"; both must be marked as
trusted. Re-importing the `.cer` from
https://www.apple.com/certificateauthority/ usually fixes it.

### notarytool reports "Invalid Credentials"

Re-run `xcrun notarytool store-credentials`. The `.p8` file is one-shot
— if you regenerated the key, the old profile is stale.

### Notarization succeeds but Gatekeeper still rejects

`xcrun stapler staple` must run _after_ `notarytool submit --wait`
completes — the script does this in the right order, but if you ran
the steps manually, re-staple. The notarization ticket is fetched
from Apple's CDN and pinned into the bundle by stapler; without it,
Gatekeeper has to make a live network call (and may fall back to
"deny" on slow networks).

### Sidecar binaries missing inside the bundle

`Tauri.conf.json` declares the sidecars under `bundle.externalBin`.
If a sidecar binary is missing from `src-tauri/bin/`, the bundle
build fails before signing even runs. See
[`src-tauri/bin/README.md`](../src-tauri/bin/README.md) for how each
sidecar is produced.

## Why this isn't automated yet

The signing flow is local-only because the cert + notary key live in
the developer's Keychain, not a CI secret. Moving to GitHub Actions
requires:

1. Exporting the cert as a `.p12` and the Apple Developer team
   identifier into repo secrets.
2. Storing the `.p8` notary key as a base64'd secret.
3. A workflow that imports the cert into a fresh keychain before
   running `package-tauri-macos.sh`.

That's a separate project — track it in the desktop-release punch
list when scoping the next release cadence.
