import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/demo/',import.meta.url));
const files = [];
async function walk(directory) {
    for (const entry of await readdir(directory,{withFileTypes:true})) {
        const path = resolve(directory,entry.name);
        if (entry.isDirectory()) await walk(path); else files.push(path);
    }
}
await walk(root);
const allowed = new Set(['.html','.js','.css','.svg','.woff','.woff2']);
for (const path of files) {
    if (!allowed.has(extname(path)) && relative(root,path) !== '.nojekyll') throw new Error(`Unexpected static file: ${relative(root,path)}`);
}
const html = await readFile(resolve(root,'index.html'),'utf8');
const references = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map(match => match[1]);
for (const path of files.filter(path => path.endsWith('.css'))) {
    const css = await readFile(path,'utf8');
    for (const [,raw] of css.matchAll(/url\(([^)]+)\)/g)) {
        const value = raw.replace(/^['"]|['"]$/g,'');
        if (value.startsWith('data:') || value.startsWith('#')) continue;
        const target = resolve(dirname(path),value);
        if (relative(root,target).startsWith('..')) throw new Error('An asset resolves outside the static output.');
        await stat(target);
    }
}
for (const reference of references) {
    if (!reference.startsWith('./')) throw new Error(`Asset path must be portable: ${reference}`);
    await stat(resolve(root,reference));
}
for (const path of files.filter(path => /\.(html|js)$/.test(path))) {
    const source = await readFile(path,'utf8');
    if (/APP_KEY|DB_PASSWORD|NexoDemo!2026|https?:\/\/(localhost|127\.0\.0\.1)|\/livewire-[a-f0-9]+\/update/.test(source)) throw new Error(`Unexpected backend reference in ${relative(root,path)}`);
}
console.log(`PASS: ${files.length} static files; all asset paths resolve locally; no backend endpoints or application credentials.`);

if (process.argv[2]) {
    const base = process.argv[2].replace(/\/?$/,'/');
    const page = await fetch(base);
    if (!page.ok || !(await page.text()).includes('Nexo Commerce')) throw new Error('Static HTTP entry point failed.');
    for (const reference of references) {
        const response = await fetch(new URL(reference,base));
        if (!response.ok) throw new Error(`HTTP asset failed: ${reference}`);
    }
    console.log(`PASS: HTTP entry point and compiled assets at ${base}`);
}
