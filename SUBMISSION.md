# Cookie Chain cApp bounty submission

## Project

**OVENLOG — Proof you were cooking**

OVENLOG is a permanent maker log for Cookie Chain. Creators timestamp a project, experiment, or work-in-progress as a transparent Memo transaction and receive a shareable CookieScan receipt.

## Submission links

- Live application: https://wanhutiger.github.io/ovenlog/
- GitHub repository: https://github.com/wanhutiger/ovenlog
- X demo thread: `[add after publishing]`
- Application/program address: canonical Memo program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`
- Example transaction: `[add after the first funded Nightly test]`

## Why it belongs on Cookie Chain

OVENLOG turns Cookie Chain's fast finality and tiny fees into a product feature. A maker log should be lightweight enough to use repeatedly; an expensive or slow chain would make that behavior unnatural. Each entry is independently verifiable through CookieScan and tied to the maker's wallet signature.

## Bounty requirements covered

- Nightly connection is required and detected through Nightly's injected Solana wallet.
- The app requests the Cookie Chain custom network using the official RPC and genesis hash.
- Users execute a real Memo transaction, sign it, broadcast it, and wait for confirmation.
- Signing, broadcast, confirmation, rejection, and RPC failures have explicit UI states.
- Connected wallet address, COOK balance, and recent activity are displayed.
- Live slot, block height, TPS, and measured RPC response time provide chain analytics.
- Successful entries link directly to their CookieScan transaction receipt.
- The official Cookie Chain bridge is linked in the empty-wallet flow.
- The source is open, documented, responsive, and has no server or secret-key dependency.

## Technical approach

The app uses React, Vite, `@solana/web3.js`, the Nightly Wallet Standard feature interface, Cookie Chain's public RPC, and the canonical Solana Memo program embedded in Cookie Chain. An entry contains compact JSON with the app/version, category, note, and UTC creation time.

No funds are transferred to OVENLOG. The only cost is the standard Cookie Chain network fee.

## Product differentiation

Competing submissions are primarily trading terminals, dashboards, and games. OVENLOG is a creator/public-good primitive: a deliberately small, repeatable proof-of-work ritual. Its visual system is based on a physical maker receipt, so the transaction is immediately legible to non-technical users.

## Current verification

- Production build completes successfully.
- Cookie Chain live metrics load from the official RPC.
- Responsive layout verified programmatically at 320, 360, 390, 414, 768, 1024
  and 1440 px: `document.scrollWidth` equals the viewport width at every step and
  no element extends past the right edge. Reproduce with
  `python3 tools/viewport-check.py`.
- Note on methodology: Chrome's `--window-size` does not set the viewport, so
  screenshots taken that way render around 500px and are then scaled into the
  image, which makes a correct layout look clipped. The check above drives
  `Emulation.setDeviceMetricsOverride` over the DevTools protocol instead.
- Category and note changes update the receipt in real time.
- Final Nightly signature/confirmation test requires an installed Nightly wallet funded with a small amount of COOK.

## Maintenance / handover

OVENLOG is intentionally client-only. It needs no database, indexer, API key, or paid service. Maintenance is limited to dependency updates and updating official network URLs if Cookie Chain changes them. I am happy to continue maintaining it or hand it over with this repository and its deployment configuration.
