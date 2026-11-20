# Tvar tela Ďoďa a varianty pre editor postavy (morph targety). Bez Blendera.
import numpy as np
import mh

# Predvolený „klasický Ďoďo“: mladý muž, skinny fat (chudé ruky a nohy, bruško), okrúhla tvár.
DODO_MAKRO = dict(gender=1.0, age=0.36, muscle=0.32, weight=0.56)  # ~19 rokov, prvák na výške

DODO_DETAILY = [
    ('stomach/stomach-pregnant-incr', 0.42),       # bruško od maminých rezňov
    ('head/head-round', 0.45),                     # okrúhla tvár
    ('head/head-oval', 0.25),                      # ale nie široká „lopata“
    ('head/head-fat-incr', 0.06),
    ('chin/chin-width-incr', 0.08),                # mladšia, mäkšia sánka
    ('chin/chin-prominent-incr', 0.08),
    ('neck/neck-scale-horiz-incr', 0.12),
    ('eyes/l-eye-height2-incr', 0.2), ('eyes/r-eye-height2-incr', 0.2),
    ('eyebrows/eyebrows-angle-up', 0.35),          # obočie do oblúka – dobrácky výraz
    ('nose/nose-scale-vert-incr', 0.3), ('nose/nose-point-width-decr', 0.3),
    ('mouth/mouth-angles-up', 0.4),                # kútiky hore
    ('mouth/mouth-lowerlip-volume-incr', 0.25),
    ('neck/neck-double-incr', 0.12),
    ('cheek/l-cheek-volume-incr', 0.35), ('cheek/r-cheek-volume-incr', 0.35),
    ('torso/torso-muscle-pectoral-decr', 0.4),
    ('torso/torso-vshape-decr', 0.35),
    ('hip/hip-scale-horiz-incr', 0.15),
] + [
    (f'arms/{s}-{p}-{t}', w)
    for s in 'lr'
    for p, t, w in [('upperarm', 'fat-decr', 0.5), ('upperarm', 'muscle-decr', 0.5),
                    ('lowerarm', 'fat-decr', 0.3), ('lowerarm', 'muscle-decr', 0.35)]
] + [
    (f'legs/{s}-{p}-{t}', w)
    for s in 'lr'
    for p, t, w in [('upperleg', 'fat-decr', 0.35), ('upperleg', 'muscle-decr', 0.4),
                    ('lowerleg', 'fat-decr', 0.3), ('lowerleg', 'muscle-decr', 0.35)]
]

# Varianty pre editor: (meno morph targetu, zmena makra, extra detaily). Delta = variant - Ďoďo.
EDITOR = [
    ('chudy', dict(weight=0.12, muscle=0.25), [('stomach/stomach-pregnant-decr', 0.3)]),
    ('pupkac', dict(weight=0.95), [('stomach/stomach-pregnant-incr', 0.6)]),
    ('svalnaty', dict(muscle=0.9, weight=0.5), []),
    ('brucho', {}, [('stomach/stomach-pregnant-incr', 0.6)]),
    ('tvar_uzka', {}, [('head/head-oval', 0.8), ('head/head-fat-decr', 0.6), ('head/head-round', -0.55)]),
    ('tvar_hranata', {}, [('head/head-square', 0.9), ('chin/chin-width-incr', 0.4)]),
    ('nos_velky', {}, [('nose/nose-scale-vert-incr', 0.7), ('nose/nose-scale-depth-incr', 0.6),
                       ('nose/nose-scale-horiz-incr', 0.5)]),
    ('nos_maly', {}, [('nose/nose-scale-vert-decr', 0.6), ('nose/nose-scale-depth-decr', 0.6),
                      ('nose/nose-scale-horiz-decr', 0.4)]),
    ('nos_orli', {}, [('nose/nose-hump-incr', 0.9), ('nose/nose-greek-incr', 0.3)]),
    ('brada_vyrazna', {}, [('chin/chin-prominent-incr', 0.8), ('chin/chin-height-incr', 0.4)]),
    ('usi_odstate', {}, [('ears/l-ear-flap-incr', 0.8), ('ears/r-ear-flap-incr', 0.8),
                         ('ears/l-ear-scale-incr', 0.3), ('ears/r-ear-scale-incr', 0.3)]),
    ('oci_velke', {}, [('eyes/l-eye-scale-incr', 0.5), ('eyes/r-eye-scale-incr', 0.5)]),
    ('lica_bucate', {}, [('cheek/l-cheek-volume-incr', 0.7), ('cheek/r-cheek-volume-incr', 0.7)]),
    ('pery_plne', {}, [('mouth/mouth-lowerlip-volume-incr', 0.6), ('mouth/mouth-upperlip-volume-incr', 0.5)]),
]

# Mimika (animovateľné): úsmev, žmurknutie, otvorené ústa
MIMIKA = [
    ('usmev', [('expression/units/caucasian/mouth-corner-puller', 0.9),
               ('expression/units/caucasian/mouth-elevation', 0.25)]),
    ('zmurk', [('expression/units/caucasian/eye-left-closure', 1.0),
               ('expression/units/caucasian/eye-right-closure', 1.0)]),
    ('usta', [('expression/units/caucasian/mouth-open', 0.6)]),
]


# Základ postavy – predvolene Ďoďo. NPC generátor (npc.py) ho prepíše cez nastav_zaklad() podľa data/postavy/npc.json.
ZAKLAD = {'makro': DODO_MAKRO, 'prsia': None, 'detaily': DODO_DETAILY, 'morphy': None}


def nastav_zaklad(makro, detaily=(), prsia=None, morphy=None):
    """makro: gender, age, muscle, weight (0..1); prsia: {cupsize, firmness}; morphy: ktoré morphy z EDITOR/MIMIKA
    vyrobiť (None = všetky)."""
    ZAKLAD.update(makro=dict(makro), detaily=[tuple(d) for d in detaily], prsia=prsia, morphy=morphy)


def detaily(zoznam):
    return [(m, w) for m, w in zoznam if w != 0]


def tvar(makro=None, extra=()):
    V0, *_ = mh.nacitaj_obj()
    mk = dict(ZAKLAD['makro'])
    mk.update(makro or {})
    zoz = mh.makro_targety(**mk) + detaily(ZAKLAD['detaily']) + list(extra)
    if ZAKLAD['prsia']:
        zoz += mh.prsia_targety(**mk, **ZAKLAD['prsia'])
    return mh.aplikuj(V0, zoz)


def vsetky_tvary():
    """Vráti (zaklad, {meno: delta}) v súradniciach MakeHumanu (dm)."""
    zaklad = tvar()
    chcem = ZAKLAD['morphy']
    delty = {}
    for meno, mk, ex in EDITOR:
        if chcem is None or meno in chcem:
            delty[meno] = tvar(mk, ex) - zaklad
    for meno, ex in MIMIKA:
        if chcem is None or meno in chcem:
            delty[meno] = mh.aplikuj(zaklad, ex) - zaklad
    return zaklad, delty
