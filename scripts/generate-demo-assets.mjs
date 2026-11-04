import { readFile, mkdir, writeFile } from 'node:fs/promises';

// Share the existing SVG artwork without requiring PHP, Composer, or MySQL to build.
const root = new URL('../', import.meta.url);
const iconSource = await readFile(new URL('resources/views/components/icon.blade.php', root), 'utf8');
const productSource = await readFile(new URL('resources/views/components/product-art.blade.php', root), 'utf8');
const iconMap = iconSource.match(/\$paths = \[([\s\S]*?)\];/)?.[1] || '';
const icons = Object.fromEntries([...iconMap.matchAll(/'([^']+)'\s*=>\s*'([^']+)'/g)].map(([, name, svg]) => [name, svg]));
const artwork = Object.fromEntries([...productSource.matchAll(/@case\('([^']+)'\)\s*(<svg[\s\S]*?<\/svg>)/g)].map(([, name, svg]) => [name, svg]));
artwork.package = productSource.match(/@default\s*(<svg[\s\S]*?<\/svg>)/)?.[1];
if (!icons.grid || !artwork.package || !artwork.headphones) throw new Error('Shared SVG assets could not be generated.');
await mkdir(new URL('static-demo/generated/', root), { recursive: true });
await writeFile(new URL('static-demo/generated/artwork.js', root), `// Generated from shared Blade SVG components.\nexport const icons = ${JSON.stringify(icons)};\nexport const artwork = ${JSON.stringify(artwork)};\n`);
console.log(`Prepared ${Object.keys(icons).length} icons and ${Object.keys(artwork).length} product illustrations.`);
