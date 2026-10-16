from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re,json,html,xml.etree.ElementTree as ET,posixpath
R=Path(__file__).resolve().parents[1];BASE='https://www.drdantegonzales.com'
redirects=json.loads((R/'redirects.json').read_text());errors=[];counts={}
class Parse(HTMLParser):
 def __init__(self):super().__init__();self.tags=[];self.ids=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.tags.append((tag,a))
  if 'id'in a:self.ids.append(a['id'])
for p in list(R.glob('*.html'))+list((R/'blog').glob('*.html')):
 rel=p.relative_to(R).as_posix();s=p.read_text();d=Parse();d.feed(s)
 if '/'+rel in redirects and rel!='index.html':continue
 for tag,a in d.tags:
  if tag=='img':
   for attr in ['width','height','alt']:
    if attr not in a:errors.append(f'{rel}: img missing {attr}: {a.get("src")}')
  attrs=['href'] if tag=='a' else ['src'] if tag in ['img','script','source'] else ['href'] if tag=='link' else []
  for attr in attrs:
   value=a.get(attr,'');u=urlsplit(value)
   if not value or u.scheme or value.startswith('//'):continue
   if not u.path:
    if u.fragment and u.fragment not in d.ids and u.fragment not in ['appointment']:errors.append(f'{rel}: missing fragment {value}')
    continue
   path=(R/u.path.lstrip('/')) if u.path.startswith('/') else (p.parent/unquote(u.path))
   if u.path=='/':path=R/'index.html'
   if not path.is_file():errors.append(f'{rel}: missing {value}')
   final='/'+posixpath.normpath(path.relative_to(R).as_posix())
   if tag=='a' and final in redirects and final!='/index.html':errors.append(f'{rel}: link to redirect {value}')
 if len(d.ids)!=len(set(d.ids)):errors.append(f'{rel}: duplicate ids')
 if len(re.findall(r'<h1\b',s))!=1:errors.append(f'{rel}: must have exactly one h1')
 schemas=[]
 for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):
  try:schemas.append(json.loads(raw))
  except Exception as e:errors.append(f'{rel}: JSON-LD {e}')
 if rel.startswith('blog/') and not any(x.get('@type')=='BlogPosting' for x in schemas):errors.append(f'{rel}: missing blog schema')
 faqs=re.findall(r'<details\b[^>]*class="faq__item"',s)
 if faqs:
  structured=[x for x in schemas if x.get('@type')=='FAQPage']
  if len(structured)!=1 or len(structured[0]['mainEntity'])!=len(faqs):errors.append(f'{rel}: FAQ mismatch')
 for kind,key in [('title','og:title'),('description','og:description')]:
  meta=[a.get('content','') for t,a in d.tags if t=='meta' and (a.get('name')==key or a.get('property')==key)]
  if rel!='404.html' and len(meta)!=1:errors.append(f'{rel}: missing/duplicate {key}')
 if 'action="#"' in s:errors.append(f'{rel}: fake form')

for row in json.load(open(R/'audit/metadata.json')):
 if not row.get('B','').startswith(BASE) or not row.get('E'):continue
 path=urlsplit(row['B']).path
 if path in redirects and path!='/index.html':continue
 p=R/(path.lstrip('/') or 'index.html');d=Parse();d.feed(p.read_text())
 actual=html.unescape(re.search(r'<title>(.*?)</title>',p.read_text(),re.S)[1])
 if actual!=row['E']:errors.append(f'{path}: title differs from audit')
 descriptions=[a['content'] for t,a in d.tags if t=='meta' and a.get('name')=='description']
 if descriptions!=[row['I']]:errors.append(f'{path}: description differs from audit')
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'};tree=ET.parse(R/'sitemap.xml');urls=[n.text for n in tree.findall('s:url/s:loc',ns)]
if len(urls)!=len(set(urls)):errors.append('Duplicate sitemap URLs')
for url in urls:
 path=urlsplit(url).path
 if path in redirects or path=='/sitemap.xml':errors.append('Redirect/non-content URL in sitemap: '+path)
 if not (R/(path.lstrip('/') or 'index.html')).is_file():errors.append('Missing sitemap file: '+path)
print(json.dumps({'errors':errors,'sitemap_urls':len(urls)},indent=2))
raise SystemExit(bool(errors))
