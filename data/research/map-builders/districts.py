# Builds data/maps/<slug>.json: district maps for each ballot's district picker, drawn from
# official boundary files (the Census Bureau's TIGERweb, which publishes each state's adopted
# plans). Nothing is traced or inferred: every shape is the publisher's own geometry, cut to a
# frame around the city and lightly simplified for display.
#
# Each map is one district type the picker offers (`districtType` codes match the bundle). The
# frame is the city's own boundary (TIGERweb Incorporated Places) plus a margin, so districts
# that only reach the city's edges still show. Major roads and water are drawn for orientation.
#
# Checks: each address in CHECKS is geocoded by the Census geocoder, which also reports the
# districts it's in. The build fails unless the shape we drew under that point is the district
# the geocoder names (this catches a wrong vintage or code), and unless every district on the
# ballot appears on its map.
#
# Usage: python3 districts.py wa|co   (needs shapely: pip install shapely)
import importlib.util
import json
import math
import sys
import urllib.parse
from pathlib import Path

from shapely import make_valid
from shapely.geometry import Point, box, shape
from shapely.ops import polylabel, unary_union

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb'
GEOCODER = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress'
WIDTH = 1000  # SVG units across the frame

# district type → TIGERweb layer, and the geocoder's name for the same layer
LAYERS = {
    'congressional': ('Legislative/MapServer/0', '120th Congressional Districts'),
    'state-senate': ('Legislative/MapServer/1', '2026 State Legislative Districts - Upper'),
    'state-house': ('Legislative/MapServer/2', '2026 State Legislative Districts - Lower'),
    # Washington elects senators and representatives from the same districts
    'legislative': ('Legislative/MapServer/1', '2026 State Legislative Districts - Upper'),
}
GEOCODER_LAYER = {
    'congressional': ['120th Congressional Districts', '119th Congressional Districts'],
    'state-senate': ['2026 State Legislative Districts - Upper', '2024 State Legislative Districts - Upper'],
    'state-house': ['2026 State Legislative Districts - Lower', '2024 State Legislative Districts - Lower'],
    'legislative': ['2026 State Legislative Districts - Upper', '2024 State Legislative Districts - Upper'],
}
PLACES = 'Places_CouSub_ConCity_SubMCD/MapServer/4'
ROADS = 'Transportation/MapServer/2'
WATER = 'Hydro/MapServer/1'

SPECS = {
    'wa': dict(
        slug='wa-general-2026-11-03', state='53', place='63000', margin=0.06,
        types=['congressional', 'legislative'],
        # Public buildings across the city; the geocoder decides which districts they're in
        checks=['600 4th Ave, Seattle, WA 98104', '1410 NE Campus Pkwy, Seattle, WA 98195',
                '2801 SW Thistle St, Seattle, WA 98126', '5201 Leary Ave NW, Seattle, WA 98107',
                '3801 S Othello St, Seattle, WA 98118', '12501 Greenwood Ave N, Seattle, WA 98133'],
    ),
    'co': dict(
        slug='co-general-2026-11-03', state='08', place='27425', margin=0.12,
        types=['state-senate', 'state-house'],
        # From 2026-general-fort-collins-co.md [K4]: the last three are unincorporated, in SD15/HD65
        checks=['300 Laporte Ave, Fort Collins, CO 80521', '2721 N Shields St, Fort Collins, CO 80524',
                '800 N Overland Trl, Fort Collins, CO 80521', '3300 W Vine Dr, Fort Collins, CO 80521'],
    ),
}


def query(layer, **params):
    url = f'{TIGER}/{layer}/query?' + urllib.parse.urlencode({'outSR': 4326, 'f': 'geojson', **params})
    raw, retrieved = cb.fetch(url)
    return json.loads(raw)['features'], retrieved


def layer_info(layer):
    raw, retrieved = cb.fetch(f'{TIGER}/{layer}?f=json')
    j = json.loads(raw)
    return {'publisher': 'U.S. Census Bureau, TIGERweb', 'title': j['description'].strip() or j['name'],
            'url': f'{TIGER}/{layer}', 'retrieved': retrieved}


def in_frame(frame, offset):
    x0, y0, x1, y1 = frame.bounds
    return dict(geometry=f'{x0},{y0},{x1},{y1}', geometryType='esriGeometryEnvelope', inSR=4326,
                spatialRel='esriSpatialRelIntersects', maxAllowableOffset=offset)


class Projection:
    """Equirectangular, scaled by cos(latitude) at the frame's center: true to shape at city scale."""

    def __init__(self, frame):
        x0, y0, x1, y1 = frame.bounds
        self.x0, self.y1 = x0, y1
        self.k = math.cos(math.radians((y0 + y1) / 2))
        self.scale = WIDTH / ((x1 - x0) * self.k)
        self.height = round((y1 - y0) * self.scale)

    def xy(self, lon, lat):
        return round((lon - self.x0) * self.k * self.scale, 1), round((self.y1 - lat) * self.scale, 1)

    def path(self, geom):
        parts = []
        for g in getattr(geom, 'geoms', [geom]):
            if g.geom_type == 'Polygon':
                for ring in [g.exterior, *g.interiors]:
                    pts = [self.xy(*c) for c in ring.coords]
                    parts.append('M' + 'L'.join(f'{x} {y}' for x, y in pts) + 'Z')
            elif g.geom_type == 'LineString':
                pts = [self.xy(*c) for c in g.coords]
                parts.append('M' + 'L'.join(f'{x} {y}' for x, y in pts))
        return ''.join(parts)


def geocode(address):
    url = GEOCODER + '?' + urllib.parse.urlencode({'address': address, 'benchmark': 'Public_AR_Current',
                                                    'vintage': 'Current_Current', 'layers': 'all', 'format': 'json'})
    raw, _ = cb.fetch(url)
    matches = json.loads(raw)['result']['addressMatches']
    assert matches, f'the geocoder found no match for {address!r}'
    return matches[0]


def build(state):
    spec = SPECS[state]
    bundle = json.loads((ROOT / 'data' / 'elections' / f"{spec['slug']}.json").read_text())
    on_ballot = {}
    for item in bundle['offices'] + bundle.get('measures', []):
        if item.get('districtType'):
            on_ballot.setdefault(item['districtType'], {})[item['districtCode']] = item.get('district') or item.get('title')

    city_f, _ = query(PLACES, where=f"STATE='{spec['state']}' AND PLACE='{spec['place']}'", outFields='BASENAME')
    assert len(city_f) == 1, 'expected one city boundary'
    city = make_valid(shape(city_f[0]['geometry']))
    x0, y0, x1, y1 = city.bounds
    m = spec['margin'] * max(x1 - x0, y1 - y0)
    frame = box(x0 - m, y0 - m, x1 + m, y1 + m)
    proj = Projection(frame)
    offset = (frame.bounds[2] - frame.bounds[0]) / 3000  # about a third of an SVG unit

    roads_f, _ = query(ROADS, outFields='NAME', **in_frame(frame, offset))
    water_f, _ = query(WATER, outFields='NAME', where='AREAWATER > 1000000', **in_frame(frame, offset))
    base = {
        'width': WIDTH, 'height': proj.height,
        'city': {'name': city_f[0]['properties']['BASENAME'], 'd': proj.path(city.intersection(frame))},
        'water': proj.path(unary_union([make_valid(shape(f['geometry'])) for f in water_f]).intersection(frame)) if water_f else '',
        'roads': proj.path(unary_union([shape(f['geometry']) for f in roads_f]).intersection(frame)) if roads_f else '',
        'sources': [layer_info(PLACES), layer_info(ROADS), layer_info(WATER)],
    }

    maps, shapes = [], {}
    for dtype in spec['types']:
        layer, _ = LAYERS[dtype]
        feats, _ = query(layer, where=f"STATE='{spec['state']}'", outFields='BASENAME,NAME', **in_frame(frame, offset))
        districts = []
        for f in feats:
            code = f['properties']['BASENAME']
            geom = make_valid(shape(f['geometry']))
            shapes[(dtype, code)] = geom
            seen = geom.intersection(frame)
            if seen.is_empty or seen.area < frame.area * 0.002:
                continue
            biggest = max(getattr(seen, 'geoms', [seen]), key=lambda g: g.area if g.geom_type == 'Polygon' else 0)
            label = polylabel(biggest, tolerance=offset)
            lx, ly = proj.xy(label.x, label.y)
            districts.append({'code': code, 'name': f['properties']['NAME'], 'onBallot': code in on_ballot.get(dtype, {}),
                              'd': proj.path(seen), 'label': [lx, ly]})
        districts.sort(key=lambda d: int(d['code']) if d['code'].isdigit() else d['code'])
        missing = set(on_ballot.get(dtype, {})) - {d['code'] for d in districts}
        assert not missing, f'{dtype}: districts on the ballot but not on the map: {missing}'
        maps.append({'districtType': dtype, 'source': layer_info(layer), 'districts': districts})
        print(f"  {dtype}: {len(districts)} districts in the frame, on the ballot: {sorted(on_ballot.get(dtype, {}))}")

    for address in spec['checks']:
        match = geocode(address)
        pt = Point(match['coordinates']['x'], match['coordinates']['y'])
        geos = match['geographies']
        for dtype in spec['types']:
            named = next((geos[k][0]['BASENAME'] for k in GEOCODER_LAYER[dtype] if geos.get(k)), None)
            assert named, f'{address}: the geocoder gave no {dtype} district'
            drawn = [code for (t, code), g in shapes.items() if t == dtype and g.contains(pt)]
            assert drawn == [named], f'{address}: geocoder says {dtype} {named}, the map has {drawn}'
        print(f"  ok {address}")

    out = ROOT / 'data' / 'maps' / f"{spec['slug']}.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({'electionSlug': spec['slug'], 'base': base, 'maps': maps}, separators=(',', ':')) + '\n')
    print(f'wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    build(sys.argv[1])
