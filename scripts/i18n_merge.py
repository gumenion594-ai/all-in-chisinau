"""Merge translation line files (same order as l_strings.json) into i18n/ru_l.json, keeping earlier entries."""
import json, re, sys, os
R = os.path.join(os.path.dirname(__file__), "..", "i18n")
keys = list(json.load(open(os.path.join(R, sys.argv[1]))).keys())
lines = []
for f in sys.argv[2:]: lines += [l for l in open(os.path.join(R, f)).read().split("\n") if l.strip()]
assert len(keys) == len(lines), (len(keys), len(lines))
out = json.load(open(os.path.join(R, "ru_l.json"))) if os.path.exists(os.path.join(R, "ru_l.json")) else {}
expr = lambda s: sorted(re.findall(r"\$\{[^}]*\}", s))
bad = 0
for k, v in zip(keys, lines):
    if k[0] != v[0] or k[-1] != v[-1] or expr(k) != expr(v):
        print("MISMATCH", k[:60], "|", v[:60]); bad += 1
    out[k] = v
json.dump(out, open(os.path.join(R, "ru_l.json"), "w"), ensure_ascii=False, indent=0)
print(len(out), "entries,", bad, "mismatches")
