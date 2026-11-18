"""Walk the subarea tree of Municipiul Chișinău and list every boundary relation."""
import json, sys
from osmapi import get, API
ROOT = 1691801
seen = {}
def walk(rid, depth, parent):
    if rid in seen: return
    d = get(f"{API}/relation/{rid}.json")
    if "error" in d: print("ERR", rid, d); return
    r = d["elements"][0]; t = r["tags"]
    seen[rid] = {"id": rid, "parent": parent, "depth": depth, "tags": {k: v for k, v in t.items() if not k.startswith("name:") or k in ("name:ro","name:en","name:ru")}}
    print("  " * depth, rid, t.get("admin_level"), t.get("name"), t.get("place"), t.get("boundary"))
    for m in r["members"]:
        if m["type"] == "relation" and m["role"] in ("subarea", "subareas", ""):
            walk(m["ref"], depth + 1, rid)
walk(ROOT, 0, None)
json.dump(seen, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
