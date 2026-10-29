// Fotos do rosto: carregar, reduzir, detectar aproximadamente o rosto e capturar pela câmera.
// Todo o processamento acontece no próprio aparelho.

const MAX = 1024;

export async function fileToCanvas(file) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    src = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = () => rej(new Error('Não foi possível ler a imagem'));
      img.src = URL.createObjectURL(file);
    });
  }
  return toCanvas(src, src.width || src.naturalWidth, src.height || src.naturalHeight);
}

export function toCanvas(src, w, h, mirror = false) {
  const k = Math.min(1, MAX / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const x = c.getContext('2d', { willReadFrequently: true });
  if (mirror) { x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export function canvasToBlob(c) {
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.9));
}

export async function blobToCanvas(blob) { return fileToCanvas(blob); }

// Estimativa dos marcadores (olhos e boca).
// 1) usa a API FaceDetector do navegador, se existir;
// 2) senão, procura a região de tons de pele e estima as proporções do rosto.
export async function detectLandmarks(canvas) {
  if ('FaceDetector' in window) {
    try {
      const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const [face] = await fd.detect(canvas);
      if (face) {
        const lm = face.landmarks || [];
        const eyes = lm.filter(l => l.type === 'eye').map(l => l.locations[0]).sort((a, b) => a.x - b.x);
        const mouth = lm.find(l => l.type === 'mouth');
        const W = canvas.width, H = canvas.height;
        if (eyes.length === 2 && mouth) {
          return { eyeL: { x: eyes[0].x / W, y: eyes[0].y / H }, eyeR: { x: eyes[1].x / W, y: eyes[1].y / H }, mouth: { x: mouth.locations[0].x / W, y: mouth.locations[0].y / H }, method: 'detector' };
        }
        const b = face.boundingBox;
        return fromBox(b.x / W, b.y / H, b.width / W, b.height / H, 'detector');
      }
    } catch { /* cai no método aproximado */ }
  }
  return skinHeuristic(canvas);
}

function fromBox(x, y, w, h, method) {
  return {
    eyeL: { x: x + w * 0.31, y: y + h * 0.42 },
    eyeR: { x: x + w * 0.69, y: y + h * 0.42 },
    mouth: { x: x + w * 0.5, y: y + h * 0.77 },
    method,
  };
}

function skinHeuristic(canvas) {
  // Procura a faixa de linhas com mais pele (o rosto é mais largo que o pescoço).
  const N = 96;
  const t = document.createElement('canvas'); t.width = N; t.height = N;
  const x = t.getContext('2d', { willReadFrequently: true });
  x.drawImage(canvas, 0, 0, N, N);
  const d = x.getImageData(0, 0, N, N).data;
  const mask = new Uint8Array(N * N);
  let total = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 4, r = d[k], g = d[k + 1], b = d[k + 2];
    const Y = 0.299 * r + 0.587 * g + 0.114 * b;
    const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const center = 1 - Math.hypot(i / N - 0.5, j / N - 0.45) * 1.3;
    if (Y > 45 && Cr > 132 && Cr < 180 && Cb > 75 && Cb < 135 && center > 0.15) { mask[j * N + i] = 1; total++; }
  }
  if (total < N * N * 0.03) return fromBox(0.25, 0.18, 0.5, 0.62, 'padrao');
  // largura de pele por linha (maior trecho contínuo)
  const widths = new Array(N).fill(0), mids = new Array(N).fill(N / 2);
  for (let j = 0; j < N; j++) {
    let best = 0, cur = 0, start = 0, bestStart = 0;
    for (let i = 0; i <= N; i++) {
      if (i < N && mask[j * N + i]) { if (!cur) start = i; cur++; }
      else { if (cur > best) { best = cur; bestStart = start; } cur = 0; }
    }
    widths[j] = best; mids[j] = bestStart + best / 2;
  }
  const maxW = Math.max(...widths);
  let top = -1, bot = -1;
  for (let j = 0; j < N; j++) if (widths[j] > maxW * 0.62) { if (top < 0) top = j; bot = j; }
  if (top < 0) return fromBox(0.25, 0.18, 0.5, 0.62, 'padrao');
  let cx = 0, n = 0;
  for (let j = top; j <= bot; j++) if (widths[j] > maxW * 0.62) { cx += mids[j]; n++; }
  cx /= n;
  // a faixa larga cobre aproximadamente da altura das sobrancelhas até o queixo
  const fw = maxW / N;
  let fh = (bot - top + 1) / N;
  fh = Math.max(fw * 1.05, Math.min(fh, fw * 1.6));
  const y0 = top / N - fh * 0.12;
  return fromBox(cx / N - fw / 2, y0, fw, fh * 1.12, 'aproximado');
}

// ---------- câmera ----------
let stream = null;
export async function startCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador não oferece acesso à câmera.');
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  video.srcObject = stream;
  await video.play();
}
export function stopCamera(video) {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (video) video.srcObject = null;
}
export function captureFrame(video) {
  // A prévia aparece espelhada (como um espelho); a foto salva também fica espelhada,
  // para que o rosto no personagem corresponda ao que a pessoa viu na tela.
  return toCanvas(video, video.videoWidth, video.videoHeight, true);
}
