import { readdirSync, writeFileSync, statSync } from "fs";
import { join, relative } from "path";

const ASSETS_DIR = "./assets";
const OUTPUT_FILE = "./assets-manifest.json";

function scanDir(dir) {
  const entries = readdirSync(dir);
  let results = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else {
      // Ex : "./assets/objets/lunettes_manu.svg" → "objets"
      const relativePath = relative(ASSETS_DIR, fullPath);
      const [category, filename] = relativePath.split(/[/\\]/);
      const name = filename.replace(/\.[^.]+$/, ""); // sans extension

      results.push({
        name: capitalize(name.replace(/_/g, " ")),
        path: `/${relativePath.replace(/\\/g, "/")}`,
        category
      });
    }
  }

  return results;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Exécution principale
const manifest = scanDir(ASSETS_DIR);
writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

console.log(`✅ Manifest généré : ${OUTPUT_FILE} (${manifest.length} fichiers trouvés)`);

