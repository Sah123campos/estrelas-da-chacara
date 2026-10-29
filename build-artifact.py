# Gera dist/estrelas-da-chacara.html: página única e autônoma (CSS, JS e fonte embutidos).
# Uso: npm install && python3 build-artifact.py
import re, subprocess, os, base64
os.makedirs('dist', exist_ok=True)
subprocess.run(['node', 'build.mjs'], check=True)
s = open('index.html', encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', s, re.S).group(1)
title = re.search(r'<title>.*?</title>', head).group(0)
svg = open('favicon.svg', 'rb').read()
icone = '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,' + base64.b64encode(svg).decode() + '">'
fonte = base64.b64encode(open('assets/fontes/PixelifySans.woff2', 'rb').read()).decode()
css = open('css/estilo.css', encoding='utf-8').read().replace('url("../assets/fontes/PixelifySans.woff2")', 'url("data:font/woff2;base64,' + fonte + '")')
js = open('dist/bundle.js', encoding='utf-8').read().replace('</script', '<\\/script')
body = re.sub(r'\s*<script type="module" src="src/main.js[^"]*"></script>', '', body)
out = f'{title}\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n{icone}\n<style>\n{css}\n</style>\n{body.strip()}\n<script type="module">\n{js}\n</script>\n'
open('dist/estrelas-da-chacara.html', 'w', encoding='utf-8').write(out)
os.remove('dist/bundle.js')
print('ok', len(out) // 1024, 'KB')
