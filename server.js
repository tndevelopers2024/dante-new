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
// If .htaccess is missing in the production deployment directory, fall back gracefully
// to prevent crashing the server with ENOENT.
const fallbackLegacyRules = [
  [ /^\/index(?:\.(html|php))?\/?$/, '/' ],
  [ /^\/blog\/is\-invisalign\-worth\-it\-for\-adults(?:\.(html|php))?\/?$/, '/blog/invisalign-for-adults.html' ],
  [ /^\/blog\/invisalign\-treatment\-for\-adults\-cost\-timeline(?:\.(html|php))?\/?$/, '/blog/invisalign-for-adults.html' ],
  [ /^\/blog\/can\-you\-chew\-gum\-with\-invisalign\-without\-affecting\-your\-treatment(?:\.(html|php))?\/?$/, '/blog/can-you-chew-gum-with-invisalign.html' ],
  [ /^\/blog\/does\-invisalign\-work\-for\-crowded\-teeth(?:\.(html|php))?\/?$/, '/blog/invisalign-for-crowded-teeth.html' ],
  [ /^\/blog\/invisalign\-vs\-braces\-choosing\-the\-right\-option\-for\-your\-smile(?:\.(html|php))?\/?$/, '/blog/braces-vs-invisalign.html' ],
  [ /^\/surgical\-orthodontist(?:\.(html|php))?\/?$/, '/surgical-orthodontics.html' ],
  [ /^\/blog\/can\-tmj\-dysfuntion\-cause\-ear\-pain(?:\.(html|php))?\/?$/, '/blog/can-tmj-dysfunction-cause-ear-pain.html' ],
  [ /^\/index\.php$/, '/' ],
  [ /^\/blogs\.php$/, '/blog.html' ],
  [ /^\/(blog1|blog2)\.php$/, '/' ],
  [ /^\/dealing-with-wisdom-teeth\.(php|html)$/, '/blog/what-causes-crowded-teeth-and-how-dentists-fix-them.html' ],
  [ /^\/about\.(php|html)$/, '/meet-our-founder.html' ],
  [ /^\/dublin-california-ca-orthodontics-office\.(php|html)$/, '/about-us.html' ],
  [ /^\/dublin-california-ca-braces-orthodontics-and-invisalign\.(php|html)$/, '/braces-and-invisalign.html' ],
  [ /^\/elite-invisalign-and-invisalign-teen-orthodontist\.(php|html)$/, '/invisalign-teen.html' ],
  [ /^\/best-dublin-ca-orthodontics-office-and-orthodontist\.(php|html)$/, '/why-dante-gonzales.html' ],
  [ /^\/sleep-apnea-specialist-dublin-california-ca\.(php|html)$/, '/sleep-apnea-treatment.html' ],
  [ /^\/sleep-apnea-dentist-in-dublin\.(php|html)$/, '/sleep-apnea-dublin.html' ],
  [ /^\/sleep-apnea-treatment-tracy\.(php|html)$/, '/sleep-apnea-tracy.html' ],
  [ /^\/meet-our-orthodontists-in-dublin-ca\.(php|html)$/, '/meet-our-orthodontists.html' ],
  [ /^\/meet-our-orthodontics-team\.(php|html)$/, '/meet-our-dublin-team.html' ],
  [ /^\/meet-the-tracy-orthodontics-team\.(php|html)$/, '/meet-our-tracy-team.html' ],
  [ /^\/dublin-ca-orthodontic-office-contact\.(php|html)$/, '/contact-dublin.html' ],
  [ /^\/tracy-ca-orthodontic-office-contact\.(php|html)$/, '/contact-tracy.html' ],
  [ /^\/impression-techniques-in-orthodontics\.(php|html)$/, '/impression-techniques.html' ],
  [ /^\/blog\/can-invisalign-fix-overbite\.(php|html)$/, '/blog/can-invisalign-fix-an-overbite.html' ],
  [ /^\/blog\/can-invisalign-fix-underbite\.(php|html)$/, '/blog/can-invisalign-fix-an-underbite.html' ],
  [ /^\/blog\/best-age-for-braces\.(php|html)$/, '/blog/whats-the-best-age-for-braces.html' ]
];

function loadLegacyRules() {
  const potentialPaths = [
    path.join(__dirname, '.htaccess'),
    path.join(process.cwd(), '.htaccess'),
    path.join(__dirname, '..', '.htaccess'),
    path.join(__dirname, '..', 'public_html', '.htaccess')
  ];

  for (const htaccessPath of potentialPaths) {
    try {
      if (fs.existsSync(htaccessPath)) {
        const parsed = [...fs.readFileSync(htaccessPath, 'utf8')
          .matchAll(/^\s*RewriteRule \^(.*?)\$ (\/\S*) \[R=301,L(?:,NE)?\]/gm)]
          .filter((match) => !match[1].startsWith('assets/') && !match[2].includes('$'))
          .map((match) => [new RegExp('^/' + match[1] + '$'), match[2]]);
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore read error and try next path or fallback
    }
  }

  return fallbackLegacyRules;
}

const legacyRules = loadLegacyRules();

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
