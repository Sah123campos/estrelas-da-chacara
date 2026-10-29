# Gera dist/estrelas-da-chacara.html: página única e autônoma (CSS + JS + three.js embutidos).
# Uso: python3 build-artifact.py   (requer `npm install` antes, para o esbuild)
import re, subprocess, os
os.makedirs('dist', exist_ok=True)
subprocess.run(['node', 'build.mjs'], check=True)  #
s = open('index.html', encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', s, re.S).group(1)
title = re.search(r'<title>.*?</title>', head).group(0)
fonts = re.search(r'<link href="https://fonts.googleapis.com[^>]*>', head).group(0)
css = open('css/style.css', encoding='utf-8').read()
js = open('dist/bundle.js', encoding='utf-8').read().replace('</script', '<\\/script')
body = re.sub(r'\s*<script type="module" src="src/main.js"></script>', '', body)
out = f'{title}\n{fonts}\n<style>\n{css}\n</style>\n{body.strip()}\n<script type="module">\n{js}\n</script>\n'
open('dist/estrelas-da-chacara.html', 'w', encoding='utf-8').write(out)
os.remove('dist/bundle.js')
print('ok', len(out) // 1024, 'KB')
