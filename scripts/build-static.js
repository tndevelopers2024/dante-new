const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');

// Recreate only the generated output, never copy server code or project metadata.
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const directory of ['assets', 'blog', 'css', 'js']) {
  fs.cpSync(path.join(root, directory), path.join(output, directory), { recursive: true });
}

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && /\.(html|xml|txt)$/.test(entry.name)) {
    fs.copyFileSync(path.join(root, entry.name), path.join(output, entry.name));
  }
}

console.log('Static website built in public/');
