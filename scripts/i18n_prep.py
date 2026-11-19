import re,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from i18n_extract import parse_lit
os.chdir(os.path.join(os.path.dirname(__file__),"..","web"))
def conv(s, prefix):
    out=[]; i=0; n=0
    pat=re.compile(r'\(?'+re.escape(prefix))
    while True:
        m=pat.search(s,i)
        if not m: out.append(s[i:]); break
        st=m.start(); paren=s[st]=='('
        j=m.end(); a1=parse_lit(s,j); ok=False
        if a1 and s[a1:a1+3]==" : ":
            b0=a1+3; b1=parse_lit(s,b0)
            if b1 and (not paren or s[b1]==')'):
                end=b1+1 if paren else b1
                out.append(s[i:st]); out.append(f"L({s[j:a1]}, {s[b0:b1]})"); i=end; n+=1; ok=True
        if not ok: out.append(s[i:m.end()]); i=m.end()
    return "".join(out), n
s=open('app.js').read()
a=s.index('  const ro = S.lang === "ro";'); b=s.index('\n}\n',a)
seg,n=conv(s[a:b],'ro ? '); print('ro?',n); s=s[:a]+seg+s[b:]
def rep(x,y,cnt=1):
    global s
    assert s.count(x)==cnt,(x,s.count(x)); s=s.replace(x,y)
rep('${(S.lang === "ro" ? AGE_RO : AGE_EN)[p.a]}','${L(AGE_RO[p.a], AGE_EN[p.a])}')
rep('DIR[p.sector][S.lang === "ro" ? 0 : 1]','L(DIR[p.sector][0], DIR[p.sector][1])')
rep('${S.lang === "ro" ? "Sectorul " + k : k + " sector"}','${L(`Sectorul ${k}`, `${k} sector`)}')
rep('S.lang === "ro" ? c.ro : c.en','L(c.ro, c.en)',2)
rep('names = S.lang === "ro" ? AGE_RO : AGE_EN;','names = AGE_RO.map((r, i) => L(r, AGE_EN[i]));')
rep('${n} ${S.lang === "ro" ? (n === 1 ? "bandă" : "benzi") : (n === 1 ? "lane" : "lanes")}','${n} ${n === 1 ? L("bandă", "lane") : L("benzi", "lanes")}')
rep('const status = ok ? (S.lang === "ro" ? "aprobat " + fmtDate(B.approved) : "adopted " + fmtDate(B.approved))','const status = ok ? L(`aprobat ${fmtDate(B.approved)}`, `adopted ${fmtDate(B.approved)}`)')
rep('const kind = S.lang === "ro" ? (KIND_RO[p.k] || String(p.k || "").replace(/_/g, " ")) : String(p.k || "").replace(/_/g, " ");','const kind = KIND_RO[p.k] ? L(KIND_RO[p.k], String(p.k).replace(/_/g, " ")) : String(p.k || "").replace(/_/g, " ");')
rep('S.lang === "ro" ? [REL_RO[p.rel] || p.rel, p.den ? REL_RO[p.den] || p.den.replace(/_/g, " ") : null].filter(Boolean).join(", ") : [p.rel, p.den].filter(Boolean).join(", ")','[p.rel, p.den].filter(Boolean).map((x) => (REL_RO[x] ? L(REL_RO[x], x.replace(/_/g, " ")) : x.replace(/_/g, " "))).join(", ")')
rep('const loc = () => L("ro-RO", "en-GB");','const loc = () => ({ ro: "ro-RO", en: "en-GB", ru: "ru-RU" }[S.lang] || "ro-RO");')
rep('const t = (k) => T[S.lang][k] ?? k;','const t = (k) => T[S.lang]?.[k] ?? T.en[k] ?? k;')
rep('$("lang").addEventListener("click", () => { S.lang = L("en", "ro"); fillRoutes(); render(); topbarRender(); chatRender(); });','$("lang").addEventListener("click", () => setLang({ ro: "en", en: "ru", ru: "ro" }[S.lang] || "ro"));')
open('app.js','w').write(s)
for f in ["nb.js","shell.js","shell2.js","shell3.js"]:
    t=open(f).read()
    t=re.sub(r'(\w+(?:\[[\w.?]+\])?)\[S\.lang === "ro" \? "ro" : "en"\]', r'L(\1.ro, \1.en)', t)
    t=re.sub(r'\b(v|q|it|Tn|T|ROLES\[k\])\[S\.lang === "ro" \? 0 : 1\]', r'L(\1[0], \1[1])', t)
    open(f,'w').write(t)
s=open('shell.js').read()
s=s.replace('''(ASSET_ERR[e?.code] || [L("Imaginea nu s-a putut încărca.", "The image could not be uploaded.")])[S.lang === "ro" ? 0 : 1]''','''(ASSET_ERR[e?.code] ? L(...ASSET_ERR[e.code]) : L("Imaginea nu s-a putut încărca.", "The image could not be uploaded."))''')
s=s.replace('''(ASSET_ERR[e?.code] || [L("nu s-a putut încărca.", "could not be uploaded.")])[S.lang === "ro" ? 0 : 1]''','''(ASSET_ERR[e?.code] ? L(...ASSET_ERR[e.code]) : L("nu s-a putut încărca.", "could not be uploaded."))''')
open('shell.js','w').write(s)
s=open('shell3.js').read(); s=s.replace('const tr2 = (v) => v[S.lang === "ro" ? 0 : 1];','const tr2 = (v) => L(v[0], v[1]);'); open('shell3.js','w').write(s)
s=open('projects.js').read()
s=s.replace('const L = (ro, en) => (S.lang === "ro" ? ro : en);','''// Russian strings are added at build time (third argument) or looked up in RUX by the Romanian text
const RUX = {};
const L = (ro, en, ru) => (S.lang === "ro" ? ro : S.lang === "ru" ? (ru ?? RUX[ro] ?? en) : en);''')
open('projects.js','w').write(s)
