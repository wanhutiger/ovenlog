#!/usr/bin/env python3
"""Measure real horizontal overflow at several viewport widths.

Why this exists: --window-size does NOT set the viewport. Screenshots taken that
way render at ~500px and get scaled into the image, which made a fixed layout
look broken. Emulation.setDeviceMetricsOverride is the only reliable way.
"""
import json, subprocess, sys, time, urllib.request
from websockets.sync.client import connect

URL = sys.argv[1] if len(sys.argv) > 1 else "https://wanhutiger.github.io/ovenlog/"
WIDTHS = [320, 360, 390, 414, 768, 1024, 1440]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9350

p = subprocess.Popen([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                      f"--remote-debugging-port={PORT}", URL],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(9)
try:
    tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=10))
    ws_url = next(t["webSocketDebuggerUrl"] for t in tabs if t.get("type") == "page")

    expr = """(() => {
      const vw = window.innerWidth;
      const off = [...document.querySelectorAll('*')]
        .map(e => ({ t: e.tagName + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''),
                     r: e.getBoundingClientRect() }))
        .filter(o => o.r.width > 0 && o.r.right > vw + 1)
        .sort((a, b) => b.r.right - a.r.right).slice(0, 5)
        .map(o => o.t + ' right=' + Math.round(o.r.right));
      return JSON.stringify({ vw, sw: document.documentElement.scrollWidth,
                              h1: getComputedStyle(document.querySelector('h1')).fontSize, off });
    })()"""

    def call(ws, i, method, params=None):
        ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
        while True:
            m = json.loads(ws.recv())
            if m.get("id") == i:
                return m

    print(f"{'width':>6} {'scrollW':>8} {'h1':>9}  overflow")
    bad = 0
    with connect(ws_url, max_size=None) as ws:
        for n, w in enumerate(WIDTHS):
            call(ws, 100 + n * 2, "Emulation.setDeviceMetricsOverride",
                 {"width": w, "height": 900, "deviceScaleFactor": 1, "mobile": w < 768})
            time.sleep(1.6)
            r = call(ws, 101 + n * 2, "Runtime.evaluate", {"expression": expr, "returnByValue": True})
            d = json.loads(r["result"]["result"]["value"])
            ok = d["sw"] <= d["vw"] + 1 and not d["off"]
            if not ok:
                bad += 1
            print(f"{d['vw']:>6} {d['sw']:>8} {d['h1']:>9}  {'none' if ok else d['off']}")
    print("\nRESULT:", "no horizontal overflow at any width" if bad == 0 else f"{bad} width(s) overflow")
    sys.exit(0 if bad == 0 else 1)
finally:
    p.kill()
