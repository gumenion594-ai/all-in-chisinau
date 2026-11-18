"""Geometry helpers: turn OSM JSON elements into shapely geometries."""
from shapely.geometry import LineString, Polygon, MultiPolygon, Point
from shapely.ops import linemerge, polygonize, unary_union
from shapely.validation import make_valid


class OSMStore:
    def __init__(self, elements=()):
        self.nodes, self.ways, self.rels = {}, {}, {}
        self.add(elements)

    def add(self, elements):
        for e in elements:
            t = e["type"]
            if t == "node":
                self.nodes[e["id"]] = e
            elif t == "way":
                self.ways[e["id"]] = e
            elif t == "relation":
                self.rels[e["id"]] = e

    def way_coords(self, wid):
        w = self.ways.get(wid)
        if not w:
            return None
        pts = []
        for n in w["nodes"]:
            nd = self.nodes.get(n)
            if nd is None:
                return None
            pts.append((nd["lon"], nd["lat"]))
        return pts

    def way_line(self, wid):
        c = self.way_coords(wid)
        if not c or len(c) < 2:
            return None
        return LineString(c)

    def way_polygon(self, wid):
        c = self.way_coords(wid)
        if not c or len(c) < 4 or c[0] != c[-1]:
            return None
        p = Polygon(c)
        return p if p.is_valid else make_valid(p)

    def rel_polygon(self, rid):
        """Assemble a multipolygon/boundary relation. Returns (geom, complete)."""
        r = self.rels.get(rid)
        if not r:
            return None, False
        outers, inners, complete = [], [], True
        for m in r["members"]:
            if m["type"] != "way":
                continue
            ln = self.way_line(m["ref"])
            if ln is None:
                complete = False
                continue
            (inners if m.get("role") == "inner" else outers).append(ln)
        if not outers:
            return None, False
        polys_o = list(polygonize(linemerge(outers) if len(outers) > 1 else outers))
        polys_o = list(polygonize(unary_union(outers)))
        if not polys_o:
            return None, False
        # polygonize of the full noded set yields all faces; keep faces whose
        # representative point lies inside an odd number of rings -> use union then
        outer = unary_union(polys_o)
        if inners:
            polys_i = list(polygonize(unary_union(inners)))
            if polys_i:
                outer = outer.difference(unary_union(polys_i))
        g = make_valid(outer)
        return g, complete


def polys_only(g):
    """Keep only polygonal parts of a geometry."""
    if g is None or g.is_empty:
        return None
    if g.geom_type in ("Polygon", "MultiPolygon"):
        return g
    if g.geom_type == "GeometryCollection":
        ps = [x for x in g.geoms if x.geom_type in ("Polygon", "MultiPolygon")]
        return unary_union(ps) if ps else None
    return None
