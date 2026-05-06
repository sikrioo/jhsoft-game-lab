export function createTransparentSpriteSheet(scene, rawKey, newKey, frameWidth, frameHeight, threshold = 18) {
  const texture = scene.textures.get(rawKey);
  if (!texture || texture.key === '__MISSING') {
    throw new Error(`Missing texture: ${rawKey}. Check asset path or filename.`);
  }

  const source = texture.getSourceImage();
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) data[i + 3] = 0;
  }

  ctx.putImageData(img, 0, 0);
  if (scene.textures.exists(newKey)) scene.textures.remove(newKey);
  scene.textures.addSpriteSheet(newKey, canvas, { frameWidth, frameHeight, margin: 0, spacing: 0 });
}
