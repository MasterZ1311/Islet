// Screen recording indicator (#224), shared by the notch and main: names the app behind a screen
// capture, picks what to show and formats the timer.
(() => {
  // capture id (package family or exe path) -> [name, mode]; mode "rec" records, "share" shares
  const KNOWN = {
    screensketch: ["Snipping Tool", "rec"], snippingtool: ["Snipping Tool", "rec"], obs64: ["OBS", "capture"], obs32: ["OBS", "capture"], // its preview captures too: only OBS itself can say "recording"
    sharex: ["ShareX", "rec"], clipchamp: ["Clipchamp", "rec"], screentogif: ["ScreenToGif", "rec"], loom: ["Loom", "rec"],
    camtasia: ["Camtasia", "rec"], gamebar: ["Game Bar", "rec"], bandicam: ["Bandicam", "rec"],
    chrome: ["Chrome", "share"], msedge: ["Edge", "share"], firefox: ["Firefox", "share"], brave: ["Brave", "share"],
    msteams: ["Teams", "share"], "ms-teams": ["Teams", "share"], teams: ["Teams", "share"], zoom: ["Zoom", "share"],
    whatsappdesktop: ["WhatsApp", "share"], discord: ["Discord", "share"], slack: ["Slack", "share"],
  };
  // process to bring forward for "Show" (a packaged app's process name differs from its package)
  const PROCESS = { screensketch: "SnippingTool" };

  // "C:#Program Files#obs-studio#bin#64bit#obs64.exe" or "Microsoft.ScreenSketch_8wekyb3d8bbwe" -> "obs64" / "screensketch"
  function idOf(key) {
    const last = String(key).split("#").pop().replace(/\.exe$/i, "").replace(/_[a-z0-9]{13}$/i, "");
    return last.split(".").pop().toLowerCase();
  }

  // one capture record -> { id, name, mode, start, proc }
  function describe(c) {
    const id = idOf(c.app);
    const [name, mode] = KNOWN[id] || [id.charAt(0).toUpperCase() + id.slice(1), "capture"];
    return { id, name, mode, start: Number.isFinite(c.start) && c.start > 0 ? c.start : null, proc: PROCESS[id] || id };
  }

  // everything known now -> the activity to show, or null. A recorder beats a share. `obs` is
  // undefined without a connection to OBS, null when OBS is connected and not recording, or its
  // status; once connected, OBS's word replaces Windows' record of it (pauses, game capture)
  function current(capture, obs, now = Date.now()) {
    const list = (Array.isArray(capture) ? capture : []).filter(c => c && typeof c.app === "string").map(describe);
    if (obs?.active) {
      return { id: "obs64", name: "OBS", mode: "rec", start: now - (obs.duration || 0), paused: !!obs.paused, proc: "obs64", obs: true };
    }
    const rank = { rec: 0, capture: 1, share: 2 };
    const a = list.filter(x => !x.id.startsWith("obs") || obs === undefined).sort((x, y) => rank[x.mode] - rank[y.mode])[0];
    return a ? { ...a, start: a.start ?? now, paused: false, obs: false } : null;
  }

  // 75000 -> "1:15", 3725000 -> "1:02:05"
  function clock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
  }


  const api = { KNOWN, idOf, describe, current, clock };
  if (typeof module !== "undefined") module.exports = api;
  else window.Rec = api;
})();
