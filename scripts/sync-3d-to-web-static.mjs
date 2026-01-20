import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const srcDir = path.join(repoRoot, '3d', 'dist');
const destDir = path.join(repoRoot, 'web', 'static', '3d');

function copyDirRecursive(from, to) {
    if (!fs.existsSync(from)) return false;

    fs.mkdirSync(to, { recursive: true });

    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const fromPath = path.join(from, entry.name);
        const toPath = path.join(to, entry.name);
        if (entry.isDirectory()) copyDirRecursive(fromPath, toPath);
        else if (entry.isFile()) fs.copyFileSync(fromPath, toPath);
    }
    return true;
}

const ok = copyDirRecursive(srcDir, destDir);
if (!ok) {
    console.log(`[sync-3d-to-web-static] skip: no 3d build output at ${srcDir}`);
} else {
    console.log(`[sync-3d-to-web-static] copied ${srcDir} -> ${destDir}`);
}

