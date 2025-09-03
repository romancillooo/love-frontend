// convert-to-webp.js
import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputDir = "public/assets/photos/love";
const outputDir = "public/assets/photos/gallery/optimized";
const jsonOutput = "public/assets/data/photos.json";

// Asegurar que exista la carpeta de salida
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(inputDir).filter(file =>
  /\.(jpg|jpeg|png|heic)$/i.test(file) // soporte básico para extensiones comunes
);

const photos = [];

files.forEach((file, index) => {
  const fileName = path.parse(file).name;
  const inputPath = path.join(inputDir, file);

  const smallFile = `${fileName}-small.webp`;
  const largeFile = `${fileName}-large.webp`;

  const smallOutput = path.join(outputDir, smallFile);
  const largeOutput = path.join(outputDir, largeFile);

  // Metadatos del archivo
  const stats = fs.statSync(inputPath);
  const createdAt = stats.birthtime || stats.mtime;

  // Convertir versión pequeña
  sharp(inputPath)
    .resize(400)
    .webp({ quality: 70 })
    .toFile(smallOutput)
    .then(() => console.log(`✅ Small: ${file}`))
    .catch(err => console.error(`❌ Error small ${file}`, err));

  // Convertir versión grande
  sharp(inputPath)
    .resize(1600)
    .webp({ quality: 85 })
    .toFile(largeOutput)
    .then(() => console.log(`✅ Large: ${file}`))
    .catch(err => console.error(`❌ Error large ${file}`, err));

  // Agregar al JSON
  photos.push({
    id: index + 1,
    small: `assets/photos/gallery/optimized/${smallFile}`,
    large: `assets/photos/gallery/optimized/${largeFile}`,
    description: "",
    createdAt: createdAt.toISOString()
  });
});

// Guardar JSON
fs.writeFileSync(jsonOutput, JSON.stringify(photos, null, 2));
console.log(`📸 JSON generado con ${photos.length} fotos → ${jsonOutput}`);
