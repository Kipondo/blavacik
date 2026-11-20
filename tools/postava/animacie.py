# Vlastné animácie postavy (keyframy v Blenderi). Uhly v stupňoch okolo osí armatúry:
# X = smer k ľavej ruke postavy, Y = dozadu, Z = hore (postava pozerá na -Y).
#  +X na končatine smerujúcej dole = švih dozadu, -X = dopredu; +X na chrbtici = predklon.
import math
import numpy as np
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

FPS = 30
import chuze
S = math.sin
C = math.cos


def base_poza():
    """Uvoľnený postoj: ruky dole popri tele (z A-pózy), mierne pokrčené lakte a prsty."""
    p = {
        'upperarm_l': (6, 30, 4), 'upperarm_r': (6, -30, -4),
        'lowerarm_l': (30, 0, 20), 'lowerarm_r': (30, 0, -20),
        'hand_l': (0, 8, -6), 'hand_r': (0, -8, 6),
        'clavicle_l': (0, 4, 0), 'clavicle_r': (0, -4, 0),
    }
    return p


PRSTY = [f'{f}_0{i}_{s}' for f in ('index', 'middle', 'ring', 'pinky') for i in (1, 2, 3) for s in 'lr']


def zluc(*pozy):
    out = {}
    for p in pozy:
        for k, v in p.items():
            if k.startswith('@'):
                out[k] = tuple(np.add(out.get(k, (0, 0, 0)), v))
            else:
                out[k] = tuple(np.add(out.get(k, (0, 0, 0)), v))
    return out


# ---------------- definície animácií ----------------
def stoj(t, T):
    p = 2 * math.pi * t / T
    return zluc(base_poza(), {
        'spine_02': (1.0 * S(p * 2), 0, 0),
        'spine_03': (0.8 * S(p * 2 + 0.5), 0, 0),
        'pelvis': (0, 1.2 * S(p), 0),
        'thigh_l': (0, -1.0 * S(p), 0), 'thigh_r': (0, -1.0 * S(p), 0),
        'head': (2 * S(p + 1), 0, 4 * S(p * 0.5 * 2)),
        'neck_01': (1.5, 0, 0),
        '@pelvis': (0.008 * S(p), 0, -0.004 + 0.002 * S(2 * p)),
    })


def chodza(t, T, sila=1.0, opity=0.0):
    p = 2 * math.pi * t / T
    s = sila
    knee = lambda f: 6 + 52 * max(0, C(f)) ** 1.6 + 10 * max(0, S(f - 0.4)) ** 4
    out = zluc(base_poza(), {
        'thigh_l': (-24 * s * S(p), 0, 0), 'thigh_r': (24 * s * S(p), 0, 0),
        'calf_l': (knee(p) * s, 0, 0), 'calf_r': (knee(p + math.pi) * s, 0, 0),
        'foot_l': (-8 * s * S(p + 0.6) - 0.35 * knee(p) * s, 0, 0),
        'foot_r': (8 * s * S(p + 0.6) - 0.35 * knee(p + math.pi) * s, 0, 0),
        'ball_l': (14 * max(0, -S(p + 0.3)) ** 2, 0, 0), 'ball_r': (14 * max(0, S(p + 0.3)) ** 2, 0, 0),
        'pelvis': (0, 2.5 * S(2 * p), 5 * S(p)),
        'spine_02': (3, 0, -3 * S(p)), 'spine_03': (0, 0, -3 * S(p)),
        'upperarm_l': (17 * s * S(p), 0, 0), 'upperarm_r': (-17 * s * S(p), 0, 0),
        'lowerarm_l': (-10 * s * max(0, -S(p)), 0, 0), 'lowerarm_r': (-10 * s * max(0, S(p)), 0, 0),
        'head': (-2, 0, 2 * S(p)),
        '@pelvis': (0.012 * S(p), 0, -0.012 + 0.014 * C(2 * p)),
    })
    if opity:
        q = p * 0.5
        out = zluc(out, {
            'spine_02': (6 * opity, 9 * opity * S(q * 1.0 + 0.3), 4 * opity * S(q * 1.7)),
            'spine_03': (0, 6 * opity * S(q * 1.3 + 1), 0),
            'head': (8 * opity, -10 * opity * S(q * 1.1 + 2), 8 * opity * S(q * 0.7)),
            'upperarm_l': (0, -14 * opity, 0), 'upperarm_r': (0, 14 * opity, 0),
            'thigh_l': (0, 0, -6 * opity), 'thigh_r': (0, 0, 6 * opity),
            '@pelvis': (0.06 * opity * S(q), 0, -0.02 * opity),
        })
    return out


def beh(t, T):
    p = 2 * math.pi * t / T
    knee = lambda f: 18 + 88 * max(0, C(f + 0.2)) ** 1.3
    return zluc(base_poza(), {
        'thigh_l': (-38 * S(p) - 10, 0, 0), 'thigh_r': (38 * S(p) - 10, 0, 0),
        'calf_l': (knee(p), 0, 0), 'calf_r': (knee(p + math.pi), 0, 0),
        'foot_l': (-12 * S(p + 0.5) - 0.3 * knee(p), 0, 0), 'foot_r': (12 * S(p + 0.5) - 0.3 * knee(p + math.pi), 0, 0),
        'pelvis': (0, 0, 8 * S(p)),
        'spine_01': (8, 0, 0), 'spine_02': (5, 0, -6 * S(p)), 'spine_03': (2, 0, -6 * S(p)),
        'neck_01': (-6, 0, 0), 'head': (-6, 0, 3 * S(p)),
        'upperarm_l': (34 * S(p) + 4, -8, 0), 'upperarm_r': (-34 * S(p) + 4, 8, 0),
        'lowerarm_l': (-72 - 14 * S(p), 0, 0), 'lowerarm_r': (-72 + 14 * S(p), 0, 0),
        'hand_l': (0, 0, -10), 'hand_r': (0, 0, 10),
        '@pelvis': (0, 0.0, -0.05 + 0.045 * abs(C(p))),
    })


def skok(t, T):
    # 0–0.15 odraz z pokrčenia, 0.15–0.75 vo vzduchu (pokrčené nohy), 0.75–1 dopad
    u = t / T
    drep = math.exp(-((u - 0.05) / 0.07) ** 2) + 0.8 * math.exp(-((u - 0.92) / 0.08) ** 2)
    vzduch = max(0, math.sin(math.pi * min(1, max(0, (u - 0.15) / 0.6))))
    return zluc(base_poza(), {
        'thigh_l': (-60 * drep - 55 * vzduch, 0, 0), 'thigh_r': (-60 * drep - 30 * vzduch, 0, 0),
        'calf_l': (95 * drep + 80 * vzduch, 0, 0), 'calf_r': (95 * drep + 45 * vzduch, 0, 0),
        'foot_l': (-35 * drep, 0, 0), 'foot_r': (-35 * drep, 0, 0),
        'spine_01': (18 * drep + 6 * vzduch, 0, 0),
        'upperarm_l': (-40 * vzduch + 20 * drep, -25 * vzduch, 0), 'upperarm_r': (-40 * vzduch + 20 * drep, 25 * vzduch, 0),
        'lowerarm_l': (-35 * vzduch, 0, 0), 'lowerarm_r': (-35 * vzduch, 0, 0),
        '@pelvis': (0, 0.04 * drep, -0.28 * drep),
    })


def sedenie(t, T):
    p = 2 * math.pi * t / T
    return zluc(base_poza(), {
        'thigh_l': (-88, 0, -4), 'thigh_r': (-88, 0, 4),
        'calf_l': (86, 0, 0), 'calf_r': (86, 0, 0),
        'foot_l': (2, 0, 0), 'foot_r': (2, 0, 0),
        'spine_01': (-6, 0, 0), 'spine_02': (4 + 1 * S(2 * p), 0, 0), 'spine_03': (4, 0, 0),
        'upperarm_l': (-28, -6, 0), 'upperarm_r': (-28, 6, 0),
        'lowerarm_l': (-38, 0, 0), 'lowerarm_r': (-38, 0, 0),
        'head': (3 + 2 * S(p), 0, 5 * S(p * 0.5)),
        '@pelvis': (0, 0.08, -0.46),
    })


def nastup_auto(t, T, obratene=False):
    u = t / T
    if obratene:
        u = 1 - u
    e = lambda a, b: min(1, max(0, (u - a) / (b - a)))
    hlad = lambda x: x * x * (3 - 2 * x)
    k1 = hlad(e(0.0, 0.45))   # predklon a krok nohou dnu
    k2 = hlad(e(0.3, 0.9))    # dosadnutie
    sed = sedenie(0, 3)
    stojp = stoj(0, 4)
    out = {}
    for kl in set(sed) | set(stojp):
        a = np.array(stojp.get(kl, (0, 0, 0)))
        b = np.array(sed.get(kl, (0, 0, 0)))
        out[kl] = tuple(a * (1 - k2) + b * k2)
    sh = math.sin(math.pi * k1) * (1 - k2 * 0.6)
    return zluc(out, {
        'spine_01': (28 * sh, 0, 0), 'neck_01': (14 * sh, 0, 0),
        'thigh_r': (-40 * sh, 0, -15 * sh), 'calf_r': (40 * sh, 0, 0),
        'upperarm_r': (-30 * sh, 20 * sh, 0),
        '@pelvis': (-0.32 * k2, 0, -0.1 * sh),
    })


def mavanie(t, T):
    u = t / T
    hore = min(1, u / 0.2) * min(1, (1 - u) / 0.2)
    p = 2 * math.pi * u * 3
    return zluc(stoj(t, T), {
        'upperarm_r': (-20 * hore, 125 * hore, 0),
        'lowerarm_r': (-60 * hore, 0, 30 * S(p) * hore),
        'hand_r': (0, 0, 15 * S(p) * hore),
        'head': (0, 0, -8 * hore),
    })


ANIMACIE = [
    ('stoj', 4.0, True, stoj),
    ('chodza', 1.05, True, lambda t, T: chuze.chodza(t, T, base=base_poza())),
    ('klus', 0.76, True, lambda t, T: chuze.beh(t, T, sila=0.7, naklon=6, base=base_poza())),
    ('beh', 0.68, True, lambda t, T: chuze.beh(t, T, base=base_poza())),
    ('skok', 0.9, False, skok),
    ('opita_chodza', 1.5, True, lambda t, T: chuze.chodza(t, T, 0.8, 1.0, base=base_poza())),
    ('plavanie', 1.4, True, lambda t, T: chuze.plavanie(t, T, base=base_poza())),
    ('plavanie_stoj', 2.0, True, lambda t, T: chuze.plavanie_stoj(t, T, base=base_poza())),
    ('sedenie', 3.0, True, sedenie),
    ('nastup_auto', 1.6, False, nastup_auto),
    ('vystup_auto', 1.6, False, lambda t, T: nastup_auto(t, T, True)),
    ('mavanie', 2.4, False, mavanie),
]


# ---------------- zápis do Blendera ----------------
def vytvor(arm, m, log):
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    rest = {b.name: b.matrix_local.to_3x3() for b in arm.data.bones}
    if arm.animation_data is None:
        arm.animation_data_create()
    for meno, T, slucka, fn in ANIMACIE:
        act = bpy.data.actions.new(meno)
        act.use_fake_user = True
        arm.animation_data.action = act
        n = int(round(T * FPS))
        snimky = range(n + 1)
        for f in snimky:
            t = (f % n) / FPS if slucka else min(f / FPS, T)
            poza = fn(t, T)
            for pb in arm.pose.bones:
                pb.rotation_mode = 'QUATERNION'
                rot = poza.get(pb.name, (0, 0, 0))
                R = rest[pb.name]
                poradie = rot[3] if len(rot) > 3 else 'XYZ'  # voliteľné poradie osí, napr. 'YXZ'
                qa = Euler([math.radians(x) for x in rot[:3]], poradie).to_quaternion()
                ql = (R.inverted() @ qa.to_matrix() @ R).to_quaternion()
                pb.rotation_quaternion = ql
                loc = poza.get('@' + pb.name)
                pb.location = (R.inverted() @ Vector(loc)) if loc else Vector((0, 0, 0))
                pb.keyframe_insert('rotation_quaternion', frame=f + 1)
                pb.keyframe_insert('location', frame=f + 1)
        log('animácia', meno, n, 'snímok')
    arm.animation_data.action = bpy.data.actions['stoj']
    for pb in arm.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.scene.render.fps = FPS
