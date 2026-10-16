const express = require('express');
const path = require('path');
const fs = require('fs');
const redirects = require('./redirects.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
});

// Preserve the explicit legacy page mappings used by the Apache deployment.
const legacyRules = [...fs.readFileSync(path.join(__dirname, '.htaccess'), 'utf8')
  .matchAll(/^\s*RewriteRule \^(.*?)\$ (\/\S*) \[R=301,L(?:,NE)?\]/gm)]
  .filter((match) => !match[1].startsWith('assets/') && !match[2].includes('$'))
  .map((match) => [new RegExp('^/' + match[1] + '$'), match[2]]);

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  let pathname;
  try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
  const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  let destination = redirects[pathname];
  if (!destination) {
    const legacy = legacyRules.find(([pattern]) => pattern.test(pathname));
    if (legacy) destination = legacy[1];
  }
  if (!destination && pathname.endsWith('.php')) {
    const candidate = pathname.slice(0, -4) + '.html';
    const local = path.resolve(__dirname, '.' + candidate);
    if (local.startsWith(__dirname + path.sep) && fs.existsSync(local)) destination = redirects[candidate] || candidate;
  }
  if (!destination && pathname !== '/' && !path.extname(pathname)) {
    const candidate = pathname.replace(/\/$/, '') + '.html';
    const local = path.resolve(__dirname, '.' + candidate);
    if (local.startsWith(__dirname + path.sep) && fs.existsSync(local)) destination = redirects[candidate] || candidate;
  }
  if (destination) return res.redirect(301, destination + query);
  next();
});

app.use(express.static(__dirname, { dotfiles: 'deny' }));

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
module.exports = app;
