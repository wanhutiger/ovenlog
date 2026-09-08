# OVENLOG

OVENLOG is a permanent maker log built on Cookie Chain. A creator connects Nightly, writes what they are building, and publishes the entry as a transparent Memo transaction. The resulting CookieScan URL is a durable, shareable receipt.

## Why this cApp

Most creator tools celebrate finished work. OVENLOG records the useful middle: the idea, commitment, experiment, or work-in-progress before it is polished. It uses Cookie Chain's low fees and fast confirmations to make on-chain timestamping practical for everyday makers.

## Features

- Required Nightly wallet connection with automatic Cookie Chain network prompt
- Live Cookie Chain slot, block height, TPS, and RPC latency
- Real on-chain Memo transaction using the canonical Memo program
- Transaction signing, broadcast, confirmation, and clear status feedback
- Permanent CookieScan receipt link after confirmation
- Connected-wallet COOK balance and recent transaction activity
- Direct link to the official Cookie Chain bridge
- Responsive layout, accessible focus states, and reduced-motion support

## How an entry works

1. Connect Nightly.
2. Choose a category and write a short maker note.
3. OVENLOG creates a JSON memo containing the app name, version, category, note, and UTC timestamp.
4. Nightly signs the transaction; the app sends it to Cookie Chain and waits for confirmation.
5. The confirmed signature links to CookieScan as permanent proof.

OVENLOG never transfers funds to itself. The user pays only the standard Cookie Chain transaction fee.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Network configuration

- HTTP RPC: `https://rpc.cookiescan.io`
- Explorer: `https://cookiescan.io`
- Bridge: `https://hyperlane.cookiescan.io`
- Wallet: Nightly
- Memo program: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

## Test checklist

- [ ] Cookie Chain metrics load without a wallet
- [ ] Nightly is detected and prompts for Cookie Chain
- [ ] Approved wallet address and COOK balance appear
- [ ] Empty notes cannot be submitted
- [ ] Wallet rejection produces an actionable error
- [ ] A funded wallet can sign and broadcast a memo
- [ ] Confirmation creates a working CookieScan transaction link
- [ ] Recent wallet activity refreshes after confirmation
- [ ] Mobile and desktop layouts remain usable

## Deployment

This is a static Vite application and can be deployed on Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host. No server secrets or environment variables are required.

## Handover

The project is intentionally client-only and uses standard Solana Web3 APIs. Maintenance consists of dependency updates and keeping official Cookie Chain URLs current. No database, indexer, or paid API is required.

## License

MIT
