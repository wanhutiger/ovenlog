import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { Buffer } from 'buffer'
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Cookie,
  ExternalLink,
  Flame,
  LoaderCircle,
  Radio,
  RefreshCw,
  WalletCards,
  X,
} from 'lucide-react'
import './styles.css'

const RPC_URL = 'https://rpc.cookiescan.io'
const EXPLORER_URL = 'https://cookiescan.io'
const BRIDGE_URL = 'https://hyperlane.cookiescan.io'
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
const connection = new Connection(RPC_URL, 'confirmed')
const MAX_NOTE = 180

const categories = ['Product', 'Code', 'Art', 'Research', 'Community']

const shorten = (value, head = 5, tail = 5) =>
  value ? `${value.slice(0, head)}…${value.slice(-tail)}` : 'Not connected'

const formatNumber = (value) =>
  Number.isFinite(value) ? new Intl.NumberFormat('en-US').format(value) : '—'

function StatusDot({ ok }) {
  return <span className={`status-dot ${ok ? 'is-live' : ''}`} aria-hidden="true" />
}

function App() {
  const [account, setAccount] = useState(null)
  const [walletError, setWalletError] = useState('')
  const [category, setCategory] = useState('Product')
  const [note, setNote] = useState('Shipping a tiny experiment on Cookie Chain.')
  const [txState, setTxState] = useState({ status: 'idle', signature: '', message: '' })
  const [metrics, setMetrics] = useState({ slot: null, blockHeight: null, tps: null, latency: null })
  const [balance, setBalance] = useState(null)
  const [recent, setRecent] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const address = account?.address || ''

  const receiptId = useMemo(() => {
    const seed = `${category}:${note}`
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    return hash.toString(16).toUpperCase().padStart(8, '0')
  }, [category, note])

  const refreshChain = async () => {
    setRefreshing(true)
    const started = performance.now()
    try {
      const [slot, blockHeight, samples] = await Promise.all([
        connection.getSlot('confirmed'),
        connection.getBlockHeight('confirmed'),
        connection.getRecentPerformanceSamples(1),
      ])
      const latency = Math.max(1, Math.round(performance.now() - started))
      const sample = samples[0]
      const tps = sample ? Math.round(sample.numTransactions / sample.samplePeriodSecs) : null
      setMetrics({ slot, blockHeight, tps, latency })
    } catch {
      setMetrics((current) => ({ ...current, latency: null }))
    } finally {
      setRefreshing(false)
    }
  }

  const refreshWallet = async (walletAddress) => {
    if (!walletAddress) return
    try {
      const key = new PublicKey(walletAddress)
      const [lamports, signatures] = await Promise.all([
        connection.getBalance(key, 'confirmed'),
        connection.getSignaturesForAddress(key, { limit: 4 }, 'confirmed'),
      ])
      setBalance(lamports / 1_000_000_000)
      setRecent(signatures)
    } catch {
      setBalance(null)
      setRecent([])
    }
  }

  useEffect(() => {
    refreshChain()
    const timer = window.setInterval(refreshChain, 15000)
    return () => window.clearInterval(timer)
  }, [])

  const connectNightly = async () => {
    setWalletError('')
    const nightly = window.nightly?.solana
    if (!nightly) {
      setWalletError('Nightly was not detected. Install the extension, then reload this page.')
      return
    }
    try {
      const genesisHash = await connection.getGenesisHash()
      if (typeof nightly.changeNetwork === 'function' && nightly.genesisHash !== genesisHash) {
        await nightly.changeNetwork({ genesisHash, url: RPC_URL })
      }
      const result = await nightly.features['standard:connect'].connect()
      const nextAccount = result.accounts?.[0]
      if (!nextAccount) throw new Error('No account was approved.')
      setAccount(nextAccount)
      await refreshWallet(nextAccount.address)
    } catch (error) {
      setWalletError(error?.message || 'Wallet connection was cancelled.')
    }
  }

  const disconnectNightly = async () => {
    try {
      await window.nightly?.solana?.features?.['standard:disconnect']?.disconnect()
    } catch {
      // Clear local state even if the wallet has already disconnected.
    }
    setAccount(null)
    setBalance(null)
    setRecent([])
    setTxState({ status: 'idle', signature: '', message: '' })
  }

  const bakeProof = async () => {
    if (!account || !note.trim()) return
    setTxState({ status: 'signing', signature: '', message: 'Check Nightly to sign your Ovenlog.' })
    try {
      const nightly = window.nightly?.solana
      const publicKey = new PublicKey(account.address)
      const latest = await connection.getLatestBlockhash('confirmed')
      const payload = JSON.stringify({
        app: 'OVENLOG',
        version: 1,
        category,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      })
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(payload, 'utf8'),
      })
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: latest.blockhash,
      }).add(memoInstruction)
      const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
      const signTransaction =
        nightly.features['solana:signTransaction']?.signTransaction ||
        nightly.features['standard:signTransaction']?.signTransaction
      if (!signTransaction) throw new Error('This Nightly version does not expose transaction signing.')
      const outputs = await signTransaction({
        account,
        transaction: serialized,
      })
      const signed = outputs?.[0]?.signedTransaction
      if (!signed) throw new Error('Nightly did not return a signed transaction.')
      const signature = await connection.sendRawTransaction(signed, { maxRetries: 3 })
      setTxState({ status: 'confirming', signature, message: 'Sent. Waiting for Cookie Chain confirmation…' })
      await connection.confirmTransaction({ signature, ...latest }, 'confirmed')
      setTxState({ status: 'success', signature, message: 'Baked permanently on Cookie Chain.' })
      await Promise.all([refreshChain(), refreshWallet(account.address)])
    } catch (error) {
      setTxState({ status: 'error', signature: '', message: error?.message || 'The transaction did not complete.' })
    }
  }

  const busy = txState.status === 'signing' || txState.status === 'confirming'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ovenlog home">
          <span className="brand-mark"><Cookie size={18} strokeWidth={2.6} /></span>
          <span>OVENLOG</span>
          <small>on Cookie Chain</small>
        </a>
        <div className="network-pill">
          <StatusDot ok={Boolean(metrics.slot)} />
          {metrics.slot ? 'Cookie Chain live' : 'Checking network'}
        </div>
        {address ? (
          <button className="wallet-button connected" onClick={disconnectNightly}>
            <span>{shorten(address)}</span><X size={15} />
          </button>
        ) : (
          <button className="wallet-button" onClick={connectNightly}>
            <WalletCards size={17} /> Connect Nightly
          </button>
        )}
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><Flame size={16} /> A permanent maker log</p>
            <h1>Proof you were<br /><span>cooking.</span></h1>
            <p className="lede">
              Timestamp what you are building on Cookie Chain. One tiny transaction becomes a permanent, shareable receipt.
            </p>
            <div className="chain-strip" aria-label="Live chain metrics">
              <div><span>Slot</span><strong>{formatNumber(metrics.slot)}</strong></div>
              <div><span>Block</span><strong>{formatNumber(metrics.blockHeight)}</strong></div>
              <div><span>TPS</span><strong>{formatNumber(metrics.tps)}</strong></div>
              <div><span>RPC</span><strong>{metrics.latency ? `${metrics.latency}ms` : '—'}</strong></div>
              <button onClick={refreshChain} aria-label="Refresh chain metrics" disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              </button>
            </div>
          </div>

          <div className="bake-station">
            <div className="station-head">
              <span>New oven entry</span>
              <span className="station-id">#{receiptId}</span>
            </div>
            <fieldset>
              <legend>What kind of work?</legend>
              <div className="category-grid">
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? 'active' : ''}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="note-field">
              <span>What are you cooking?</span>
              <textarea
                value={note}
                maxLength={MAX_NOTE}
                onChange={(event) => setNote(event.target.value)}
                placeholder="A specific thing you are making or shipping…"
              />
              <small>{note.length}/{MAX_NOTE}</small>
            </label>
            {walletError && <div className="inline-message error"><CircleAlert size={16} />{walletError}</div>}
            {txState.message && (
              <div className={`inline-message ${txState.status}`}>
                {busy && <LoaderCircle size={16} className="spin" />}
                {txState.status === 'success' && <Check size={16} />}
                {txState.status === 'error' && <CircleAlert size={16} />}
                <span>{txState.message}</span>
              </div>
            )}
            {address ? (
              <button className="bake-button" onClick={bakeProof} disabled={!note.trim() || busy}>
                {busy ? 'Baking…' : 'Bake this on-chain'} <ChevronRight size={19} />
              </button>
            ) : (
              <button className="bake-button" onClick={connectNightly}>
                Connect Nightly to bake <ChevronRight size={19} />
              </button>
            )}
            <p className="fee-note">Uses only the standard Cookie Chain network fee. No funds are sent to OVENLOG.</p>
          </div>

          <aside className={`receipt ${txState.status === 'success' ? 'stamped' : ''}`} aria-label="Ovenlog receipt preview">
            <div className="receipt-top">
              <Cookie size={28} fill="currentColor" />
              <strong>OVENLOG</strong>
              <span>MAKER RECEIPT</span>
            </div>
            <div className="receipt-rule" />
            <dl>
              <div><dt>ENTRY</dt><dd>#{receiptId}</dd></div>
              <div><dt>TYPE</dt><dd>{category.toUpperCase()}</dd></div>
              <div><dt>NETWORK</dt><dd>COOKIE CHAIN</dd></div>
              <div><dt>MAKER</dt><dd>{address ? shorten(address, 4, 4) : 'AWAITING WALLET'}</dd></div>
              <div><dt>TIME</dt><dd>{new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</dd></div>
            </dl>
            <div className="receipt-note">
              <span>BAKE NOTE</span>
              <p>{note || 'Your build note will appear here.'}</p>
            </div>
            <div className="receipt-rule" />
            <div className="barcode" aria-hidden="true" />
            <p className="receipt-footer">FAST CULTURE · CHEAP PROOF · FOREVER</p>
            {txState.status === 'success' && <div className="stamp">BAKED</div>}
            {txState.signature && (
              <a className="receipt-link" href={`${EXPLORER_URL}/tx/${txState.signature}`} target="_blank" rel="noreferrer">
                View transaction <ArrowUpRight size={14} />
              </a>
            )}
          </aside>
        </section>

        <section className="wallet-panel">
          <div className="panel-title">
            <span><Radio size={17} /> Wallet activity</span>
            <strong>{address ? `${balance ?? '—'} COOK` : 'Connect to inspect'}</strong>
          </div>
          {address && recent.length > 0 ? (
            <div className="activity-list">
              {recent.map((item) => (
                <a key={item.signature} href={`${EXPLORER_URL}/tx/${item.signature}`} target="_blank" rel="noreferrer">
                  <span className={item.err ? 'failed' : 'confirmed'}>{item.err ? 'Failed' : 'Confirmed'}</span>
                  <code>{shorten(item.signature, 9, 9)}</code>
                  <small>{item.blockTime ? new Date(item.blockTime * 1000).toLocaleString() : 'Pending timestamp'}</small>
                  <ExternalLink size={15} />
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-activity">
              <p>{address ? 'No recent Cookie Chain transactions found.' : 'Your latest Cookie Chain receipts will appear here.'}</p>
              <a href={BRIDGE_URL} target="_blank" rel="noreferrer">Get COOK via the bridge <ArrowUpRight size={14} /></a>
            </div>
          )}
        </section>

        <section className="how-it-works">
          <div>
            <p className="eyebrow">Why it exists</p>
            <h2>A receipt for the messy middle.</h2>
          </div>
          <p>Launch posts celebrate the finish line. OVENLOG records the work before it is polished—the idea, the promise, the moment you began. Each entry is signed by your wallet and timestamped by Cookie Chain.</p>
          <ol>
            <li><strong>Write</strong><span>Name the thing you are making.</span></li>
            <li><strong>Sign</strong><span>Nightly signs a transparent memo transaction.</span></li>
            <li><strong>Share</strong><span>Use the explorer receipt as permanent proof.</span></li>
          </ol>
        </section>
      </main>

      <footer>
        <span>OVENLOG is an open-source cApp built for Cookie Chain.</span>
        <nav>
          <a href="https://docs.cookiechain.wtf" target="_blank" rel="noreferrer">Docs</a>
          <a href={EXPLORER_URL} target="_blank" rel="noreferrer">Explorer</a>
          <a href={BRIDGE_URL} target="_blank" rel="noreferrer">Bridge</a>
        </nav>
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
