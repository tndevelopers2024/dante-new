const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../server');
const redirects = require('../redirects.json');
let server, base;
before(async () => {
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server ? server.close(resolve) : resolve()));

test('all sitemap documents return 200 and expose security headers', async () => {
  const xml = fs.readFileSync(path.join(__dirname, '../sitemap.xml'), 'utf8');
  for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const pathname = new URL(match[1]).pathname;
    const res = await fetch(base + pathname, { redirect: 'manual' });
    assert.equal(res.status, 200, pathname);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    await res.arrayBuffer();
  }
});

test('merged, misspelled, extensionless and PHP URLs redirect directly to the final page', async () => {
  const routes = { ...redirects,
    '/about-us': '/about-us.html', '/about-us/': '/about-us.html',
    '/invisalign.php': '/invisalign.html', '/index.php': '/',
    '/dublin-ca-orthodontic-office-contact.php': '/contact-dublin.html',
    '/blog/can-invisalign-fix-overbite.php': '/blog/can-invisalign-fix-an-overbite.html',
  };
  for (const [source, target] of Object.entries(redirects)) {
    routes[source.replace(/\.html$/, '')] = target;
    routes[source.replace(/\.html$/, '.php')] = target;
  }
  for (const [source, target] of Object.entries(routes)) {
    for (const method of ['GET', 'HEAD']) {
      const res = await fetch(base + source + '?utm_source=audit', { method, redirect: 'manual' });
      assert.equal(res.status, 301, source);
      assert.equal(res.headers.get('location'), target + '?utm_source=audit', source);
      await res.arrayBuffer();
    }
  }
});

test('unknown and spam-like paths stay 404 instead of redirecting to the homepage', async () => {
  for (const pathname of ['/missing-page', '/unknown-spam.php', '/blog/gibberish.html']) {
    const res = await fetch(base + pathname, { redirect: 'manual' });
    assert.equal(res.status, 404, pathname);
    assert.equal(res.headers.get('location'), null);
    await res.arrayBuffer();
  }
});

test('HTTPS responses advertise HSTS behind the deployment proxy', async () => {
  const res = await fetch(base, { headers: { 'X-Forwarded-Proto': 'https' } });
  assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000');
  await res.arrayBuffer();
});
