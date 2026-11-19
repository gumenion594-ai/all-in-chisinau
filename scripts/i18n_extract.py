"""Find L("ro", "en") calls with literal arguments in the web JS; used to add Russian at build time."""
import re, json, sys, os

def parse_lit(s, i):
    """Parse a JS string/template literal starting at s[i]; return end index (exclusive) or None."""
    q = s[i]
    if q not in "\"'`": return None
    j = i + 1
    while j < len(s):
        c = s[j]
        if c == "\\": j += 2; continue
        if q == "`" and c == "$" and s[j+1:j+2] == "{":
            j = skip_expr(s, j + 2)
            if j is None: return None
            continue
        if c == q: return j + 1
        if q != "`" and c == "\n": return None
        j += 1
    return None

def skip_expr(s, j):
    depth = 1
    while j < len(s):
        c = s[j]
        if c in "\"'`":
            e = parse_lit(s, j)
            if e is None: return None
            j = e; continue
        if c == "{": depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0: return j + 1
        j += 1
    return None

def calls(s):
    out = []
    for m in re.finditer(r"(?<![\w$.])L\(", s):
        i = m.end()
        while s[i] in " \n": i += 1
        a0 = i; a1 = parse_lit(s, i)
        if not a1: continue
        i = a1
        while s[i] in " \n": i += 1
        if s[i] != ",": continue
        i += 1
        while s[i] in " \n": i += 1
        b0 = i; b1 = parse_lit(s, i)
        if not b1: continue
        i = b1
        while s[i] in " \n": i += 1
        if s[i] != ")": continue
        out.append((m.start(), i, s[a0:a1], s[b0:b1], b1))
    return out

if __name__ == "__main__":
    D = os.path.join(os.path.dirname(__file__), "..", "web")
    allc = {}
    for f in ["app.js", "projects.js", "nb.js", "shell.js", "shell2.js", "shell3.js", "shell4.js"]:
        for st, en, ro, e, b1 in calls(open(os.path.join(D, f)).read()):
            allc.setdefault(ro, e)
    json.dump(allc, open(sys.argv[1], "w"), ensure_ascii=False, indent=0)
    print(len(allc), sum(len(k) for k in allc), "chars")
