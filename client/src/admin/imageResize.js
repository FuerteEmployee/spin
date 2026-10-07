const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD = 6 * 1024 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read. Please try another file.'));
    };
    img.src = url;
  });
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Bounding box of the visible (non-transparent) pixels, in the image's own pixels.
// Logos often come with wide, uneven transparent borders that make them look small and
// off-centre on the page.
function visibleBox(img) {
  // Measure on a copy of at most 1000px to keep it fast
  const probe = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * probe));
  const h = Math.max(1, Math.round(img.naturalHeight * probe));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // fully transparent

  const pad = 1; // one probe pixel of breathing room
  const sx = Math.max(0, (minX - pad) / probe);
  const sy = Math.max(0, (minY - pad) / probe);
  return {
    sx,
    sy,
    sw: Math.min(img.naturalWidth, (maxX + 1 + pad) / probe) - sx,
    sh: Math.min(img.naturalHeight, (maxY + 1 + pad) / probe) - sy,
  };
}

// Phone photos are often 5-10 MB. Shrink to `maxSize` px on the long edge and re-encode,
// so backgrounds load quickly on mobile data. keepAlpha keeps transparency and trims empty
// transparent borders (logos).
export async function prepareImage(file, { maxSize, keepAlpha = false }) {
  if (!ACCEPTED.includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');

  const img = await loadImage(file);
  const box = (keepAlpha && visibleBox(img)) || { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
  const trimmed = box.sw < img.naturalWidth || box.sh < img.naturalHeight;
  const scale = Math.min(1, maxSize / Math.max(box.sw, box.sh));
  if (scale === 1 && !trimmed && file.size <= 800 * 1024) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(box.sw * scale));
  canvas.height = Math.max(1, Math.round(box.sh * scale));
  canvas.getContext('2d').drawImage(img, box.sx, box.sy, box.sw, box.sh, 0, 0, canvas.width, canvas.height);

  let blob = await toBlob(canvas, 'image/webp', 0.85);
  // Browsers that can't encode WebP fall back to PNG, which is huge for photos
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, keepAlpha ? 'image/png' : 'image/jpeg', 0.85);
  }
  if (!blob) throw new Error('That image could not be processed. Please try another file.');
  if (blob.size > MAX_UPLOAD) throw new Error('That image is too large. Please use one under 6 MB.');
  return blob;
}
