import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const srcDir = path.join(repoRoot, '3d', 'dist');
const destDir = path.join(repoRoot, 'web', 'build', 'client', '3d');
const fallbackStaticDir = path.join(repoRoot, 'web', 'static', '3d');

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
    console.log(`[sync-3d-to-web-build] skip: no 3d build output at ${srcDir}`);
    process.exit(0);
}

copyDirRecursive(srcDir, fallbackStaticDir);

if (!fs.existsSync(path.join(repoRoot, 'web', 'build'))) {
    console.log('[sync-3d-to-web-build] note: web is not built yet; copied into web/build may not be used until after web build');
} else {
    console.log(`[sync-3d-to-web-build] copied ${srcDir} -> ${destDir}`);
}

