// Smart file actions for the shelf: resize, convert and compress. Each action writes a
// new file next to the original (never overwriting anything) and returns its path.
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const IMAGE = new Set([".png", ".jpg", ".jpeg", ".bmp"]);
const isImage = p => IMAGE.has(path.extname(p).toLowerCase());

// "photo.jpg" + " (half)", ".jpg" -> "photo (half).jpg", or "photo (half) 2.jpg" when taken
function outPath(p, tag, ext, exists = fs.existsSync) {
  const dir = path.dirname(p), base = path.basename(p, path.extname(p)) + tag;
  for (let n = 1; ; n++) {
    const out = path.join(dir, base + (n > 1 ? ` ${n}` : "") + ext);
    if (!exists(out)) return out;
  }
}

// the actions a file offers, as [{ id, label }]
function actionsFor(p, isDir = false) {
  const list = [];
  if (!isDir && isImage(p)) {
    const ext = path.extname(p).toLowerCase();
    list.push({ id: "half", label: "Resize to 50%" }, { id: "fit1920", label: "Resize to fit 1920 px" });
    if (ext !== ".png") list.push({ id: "png", label: "Convert to PNG" });
    if (ext !== ".jpg" && ext !== ".jpeg") list.push({ id: "jpg", label: "Convert to JPG" });
    list.push({ id: "smaller", label: "Compress image (JPG, quality 70)" });
  }
  list.push({ id: "zip", label: "Compress to ZIP" });
  return list;
}

// new size for an image: half, or scaled down to fit a box (never up)
function targetSize({ width, height }, id) {
  if (id === "half") return { width: Math.max(1, Math.round(width / 2)), height: Math.max(1, Math.round(height / 2)) };
  if (id === "fit1920") {
    const k = Math.min(1, 1920 / Math.max(width, height));
    return { width: Math.round(width * k), height: Math.round(height * k) };
  }
  return { width, height };
}

function zip(src, out) {
  return new Promise((resolve, reject) => {
    // paths go through the environment, so no quoting of user file names is needed
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
      "Compress-Archive -LiteralPath $env:ISLET_SRC -DestinationPath $env:ISLET_OUT"],
      { env: { ...process.env, ISLET_SRC: src, ISLET_OUT: out }, windowsHide: true, timeout: 120000 },
      err => err ? reject(new Error("couldn't make the ZIP")) : resolve(out));
  });
}

// run an action; nativeImage is Electron's, passed in so this module stays testable
async function run(p, id, nativeImage) {
  if (id === "zip") return zip(p, outPath(p, "", ".zip"));
  if (!isImage(p)) throw new Error("not an image");
  const img = nativeImage.createFromPath(p);
  if (img.isEmpty()) throw new Error("couldn't read the image");
  const ext = path.extname(p).toLowerCase();
  let out, data;
  if (id === "half" || id === "fit1920") {
    const sized = img.resize({ ...targetSize(img.getSize(), id), quality: "best" });
    const jpg = ext === ".jpg" || ext === ".jpeg";
    out = outPath(p, id === "half" ? " (50%)" : " (1920)", jpg ? ext : ".png");
    data = jpg ? sized.toJPEG(90) : sized.toPNG();
  } else if (id === "png") { out = outPath(p, "", ".png"); data = img.toPNG(); }
  else if (id === "jpg") { out = outPath(p, "", ".jpg"); data = img.toJPEG(90); }
  else if (id === "smaller") { out = outPath(p, " (small)", ".jpg"); data = img.toJPEG(70); }
  else throw new Error("unknown action");
  fs.writeFileSync(out, data, { flag: "wx" });
  return out;
}

module.exports = { actionsFor, outPath, targetSize, isImage, run };
