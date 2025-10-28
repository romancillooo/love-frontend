import crypto from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const inputDir = 'public/assets/photos/love';
const outputDir = 'public/assets/photos/gallery/optimized';
const jsonOutput = 'public/assets/data/photos.json';

const SUPPORTED_EXT = /\.(jpg|jpeg|png|heic)$/i;

const ensureDir = async (dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

const createStableId = (seed = '') => {
  const digest = crypto.createHash('md5').update(seed).digest('hex').slice(0, 8);
  return Number.parseInt(digest, 16);
};

const formatPhotoRecord = (baseName, createdAt, index) => ({
  id: createStableId(baseName) + index, // suma el índice por si hubiera colisiones
  small: `assets/photos/gallery/optimized/${baseName}-small.webp`,
  large: `assets/photos/gallery/optimized/${baseName}-large.webp`,
  description: '',
  createdAt: createdAt.toISOString(),
});

const processPhoto = async (file, index) => {
  const fileName = path.parse(file).name;
  const inputPath = path.join(inputDir, file);

  const smallFile = `${fileName}-small.webp`;
  const largeFile = `${fileName}-large.webp`;

  const smallOutput = path.join(outputDir, smallFile);
  const largeOutput = path.join(outputDir, largeFile);

  const stats = await fs.stat(inputPath);
  const createdAt = stats.birthtime ?? stats.mtime;

  await Promise.all([
    sharp(inputPath).resize(400).webp({ quality: 70 }).toFile(smallOutput),
    sharp(inputPath).resize(1600).webp({ quality: 85 }).toFile(largeOutput),
  ]);

  console.log(`✅ Convertido ${file}`);
  return formatPhotoRecord(fileName, createdAt, index);
};

const run = async () => {
  await ensureDir(outputDir);

  const files = (await fs.readdir(inputDir)).filter((file) => SUPPORTED_EXT.test(file));

  if (!files.length) {
    console.warn('⚠️  No se encontraron fotos para convertir.');
    return;
  }

  const conversions = await Promise.all(files.map(processPhoto));
  const sorted = conversions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  await fs.writeFile(jsonOutput, JSON.stringify(sorted, null, 2));
  console.log(`📸 JSON generado con ${sorted.length} fotos → ${jsonOutput}`);
};

run().catch((error) => {
  console.error('❌ Error convirtiendo imágenes', error);
  process.exit(1);
});
