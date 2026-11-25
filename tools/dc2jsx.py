#!/usr/bin/env python3
"""Convert a .dc.html design component into a React screen:
   view.jsx (template -> JSX), logic.js (logic class), style.css (helmet styles).
Usage: dc2jsx.py <in.dc.html> <outdir> <ScreenName> <blobmap.json>
"""
import sys, re, json, html, os

SRC, OUT, NAME, BLOBMAP = sys.argv[1:5]
blobmap = json.load(open(BLOBMAP))
s = open(SRC, encoding='utf-8').read()

# ---------- split the file ----------
xdc = s[s.index('<x-dc>') + 6: s.index('</x-dc>')]
hm = re.search(r'<helmet>(.*?)</helmet>', xdc, re.S)
helmet = hm.group(1) if hm else ''
tpl = xdc[hm.end():] if hm else xdc
sm = re.search(r'<script type="text/x-dc" data-dc-script[^>]*>(.*?)</script>', s, re.S)
script = sm.group(1)
dp = re.search(r"data-props='([^']*)'", s)
props_meta = json.loads(html.unescape(dp.group(1))) if dp else {}

def fix_blobs(t):
    return re.sub(r'/_blob/([0-9a-f]{32})', lambda m: blobmap[m.group(1)], t)

# ---------- styles ----------
css = '\n'.join(re.findall(r'<style>(.*?)</style>', helmet, re.S))
css = fix_blobs(css)
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'style.css'), 'w', encoding='utf-8').write(
    f'/* {NAME}: canvas <helmet> styles, assets re-pointed to local files */\n' + css.strip() + '\n')

# ---------- logic ----------
assert 'class Component extends DCLogic' in script
logic = script.replace('class Component extends DCLogic', f'export default class {NAME}Logic extends DCLogic', 1)
defaults = {k: v['default'] for k, v in props_meta.items() if isinstance(v, dict) and 'default' in v}
open(os.path.join(OUT, 'logic.js'), 'w', encoding='utf-8').write(
    "import { DCLogic } from '../../dc/runtime.jsx';\n\n"
    + f"// Default values of this screen's design tweaks (from the canvas data-props)\nexport const defaults = {json.dumps(defaults, ensure_ascii=False)};\n"
    + logic.strip('\n') + '\n')

# ---------- template -> tree ----------
VOID = {'img', 'input', 'br', 'hr', 'meta', 'link', 'source'}
tok = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][\w-]*)((?:\s+[\w:.-]+(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'))?)*)\s*(/?)>', re.S)
attr_re = re.compile(r'([\w:.-]+)(?:\s*=\s*("[^"]*"|\'[^\']*\'))?')

root = {'tag': '#root', 'attrs': [], 'kids': []}
stack = [root]
pos = 0
for m in tok.finditer(tpl):
    if m.start() > pos:
        stack[-1]['kids'].append(tpl[pos:m.start()])
    pos = m.end()
    if m.group(0).startswith('<!--'):
        continue
    close, tag, attrs, selfc = m.groups()
    if close:
        assert stack[-1]['tag'] == tag, (stack[-1]['tag'], tag, m.start())
        stack.pop()
        continue
    al = [(a, (v[1:-1] if v else None)) for a, v in attr_re.findall(attrs)]
    node = {'tag': tag, 'attrs': al, 'kids': []}
    stack[-1]['kids'].append(node)
    if not selfc and tag not in VOID:
        stack.append(node)
if pos < len(tpl):
    stack[-1]['kids'].append(tpl[pos:])
assert len(stack) == 1, [n['tag'] for n in stack]

# ---------- emit ----------
HOLE = re.compile(r'\{\{([\s\S]+?)\}\}')
LIT = {'true': 'true', 'false': 'false', 'null': 'null', 'undefined': 'undefined'}
imports = set()

def expr(path, scope):
    p = path.strip()
    if p in LIT: return LIT[p]
    if re.fullmatch(r'-?\d+(\.\d+)?', p): return p
    segs = p.split('.')
    head = segs[0]
    if head in scope:
        base = scope[head]
    else:
        base = 'v.' + head
    return base + ''.join('?.' + x for x in segs[1:])

def js_str(t):
    return json.dumps(t, ensure_ascii=False)

def tl_escape(t):
    return t.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

def value_code(raw, scope):
    """attribute value -> JSX expression code (without braces)"""
    t = html.unescape(raw)
    m = re.fullmatch(r'\s*\{\{([\s\S]+?)\}\}\s*', t)
    if m: return expr(m.group(1), scope)
    if '{{' in t:
        parts = HOLE.split(t)
        out = ''.join(tl_escape(x) if i % 2 == 0 else '${' + expr(x, scope) + " ?? ''}" for i, x in enumerate(parts))
        return '`' + out + '`'
    return js_str(t)

def split_decls(st):
    out, buf, depth, q = [], '', 0, None
    for ch in st:
        if q:
            buf += ch
            if ch == q: q = None
            continue
        if ch in '\'"': q = ch
        elif ch == '(': depth += 1
        elif ch == ')': depth -= 1
        elif ch == ';' and depth == 0:
            out.append(buf); buf = ''; continue
        buf += ch
    out.append(buf)
    return [d.strip() for d in out if d.strip()]

def camel(p):
    if p.startswith('--'): return p
    p = p.lower()
    if p.startswith('-webkit-'): p = 'Webkit-' + p[8:]
    elif p.startswith('-moz-'): p = 'Moz-' + p[5:]
    elif p.startswith('-ms-'): p = 'ms-' + p[4:]
    return re.sub(r'-([a-z])', lambda m: m.group(1).upper(), p)

def style_code(raw, scope):
    t = html.unescape(raw)
    items = []
    for d in split_decls(t):
        k, _, val = d.partition(':')
        val = fix_blobs(val.strip())
        key = camel(k.strip())
        kc = js_str(key) if not re.fullmatch(r'[A-Za-z_$][\w$]*', key) else key
        items.append(f'{kc}: {value_code(val, scope)}')
    return '{ ' + ', '.join(items) + ' }'

ATTR_MAP = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'maxlength': 'maxLength',
            'autocomplete': 'autoComplete', 'enterkeyhint': 'enterKeyHint', 'shape-rendering': 'shapeRendering',
            'readonly': 'readOnly', 'colspan': 'colSpan', 'rowspan': 'rowSpan', 'stroke-width': 'strokeWidth',
            'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'stroke-linecap': 'strokeLinecap',
            'stroke-linejoin': 'strokeLinejoin', 'crossorigin': 'crossOrigin'}

def kebab_to_camel(a):
    return re.sub(r'-([a-z])', lambda m: m.group(1).upper(), a)

loop_n = [0]

def emit(node, scope, ind):
    pad = '  ' * ind
    if isinstance(node, str):
        t = node
        if '{{' not in t:
            if not t.strip() and ' ' not in t:
                return None  # newline/tab-only whitespace is dropped (as the canvas runtime does)
            return pad + '{' + js_str(html.unescape(t)) + '}'
        parts = HOLE.split(t)
        out = []
        for i, x in enumerate(parts):
            if i % 2 == 0:
                if x: out.append('{' + js_str(html.unescape(x)) + '}')
            else:
                out.append('{' + expr(x, scope) + '}')
        return pad + ''.join(out)
    tag, attrs, kids = node['tag'], dict(node['attrs']), node['kids']
    if tag == 'sc-if':
        cond = value_code(attrs['value'], scope)
        body = emit_kids(kids, scope, ind + 1)
        return f'{pad}{{{cond} ? (\n{pad}  <>\n{body}\n{pad}  </>\n{pad}) : null}}'
    if tag == 'sc-for':
        lst = value_code(attrs['list'], scope)
        var = attrs.get('as', 'item')
        loop_n[0] += 1
        iv = f'i{loop_n[0]}'
        sc = dict(scope); sc[var] = var; sc['$index'] = iv
        body = emit_kids(kids, sc, ind + 2)
        return (f'{pad}{{asList({lst}).map(({var}, {iv}) => (\n{pad}  <Fragment key={{{iv}}}>\n{body}\n'
                f'{pad}  </Fragment>\n{pad}))}}')
    if tag == 'dc-import':
        comp = attrs.pop('name')
        imports.add(comp)
        tag_out = comp
        props = []
        for a, val in node['attrs']:
            if a == 'name' or a.startswith('hint-'): continue
            props.append(f'{kebab_to_camel(a)}={{{value_code(val or "", scope)}}}')
        return f'{pad}<{tag_out} {" ".join(props)} />'
    # ordinary element
    has_value = 'value' in attrs
    names = [a for a, _ in node['attrs']]
    props = []
    for a, val in node['attrs']:
        if a.startswith('hint-'): continue
        if val is None:
            props.append(ATTR_MAP.get(a, a)); continue
        if a == 'style':
            props.append(f'style={{{style_code(val, scope)}}}'); continue
        name = ATTR_MAP.get(a, a)
        if name == 'onInput' and has_value and 'onChange' not in names:
            name = 'onChange'  # React's controlled inputs fire onChange on every keystroke
        props.append(f'{name}={{{value_code(fix_blobs(val), scope)}}}')
    open_tag = f'<{tag}' + (' ' + ' '.join(props) if props else '')
    if tag in VOID or not kids:
        return f'{pad}{open_tag} />'
    in_svg = tag in ('svg', 'g', 'defs')
    body = emit_kids([k for k in kids if not (in_svg and isinstance(k, str) and not k.strip())], scope, ind + 1)
    if not body.strip():
        return f'{pad}{open_tag} />'
    return f'{pad}{open_tag}>\n{body}\n{pad}</{tag}>'

def emit_kids(kids, scope, ind):
    lines = [emit(k, scope, ind) for k in kids]
    return '\n'.join(l for l in lines if l is not None)

body = emit_kids(root['kids'], {}, 3)
imp = ''.join(f"import {c} from '../{c}/index.jsx';\n" for c in sorted(imports))
view = f"""// {NAME} screen template, converted from the canvas .dc.html by tools/dc2jsx.py.
// `v` holds this screen's props merged with the values returned by renderVals() in logic.js.
import {{ Fragment }} from 'react';
import {{ asList }} from '../../dc/runtime.jsx';
{imp}
export default function render{NAME}(v) {{
  return (
    <>
{body}
    </>
  );
}}
"""
open(os.path.join(OUT, 'view.jsx'), 'w', encoding='utf-8').write(view)
open(os.path.join(OUT, 'index.jsx'), 'w', encoding='utf-8').write(
    f"import {{ makeScreen }} from '../../dc/runtime.jsx';\nimport {NAME}Logic, {{ defaults }} from './logic.js';\n"
    f"import render{NAME} from './view.jsx';\nimport './style.css';\n\n"
    f"export default makeScreen('{NAME}', {NAME}Logic, render{NAME}, defaults);\n")
print(NAME, 'ok', 'imports:', sorted(imports))
