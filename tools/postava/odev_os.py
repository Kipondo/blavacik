# Geometrické pomocníky pre textúry: poloha okolo osi končatiny.
import numpy as np


def uhol_okolo_osi(P, a, b, smer0):
    """Pre body P (…,3) vráti (bod na osi a-b, oblúková vzdialenosť od smeru smer0 okolo osi v metroch)."""
    d = b - a
    dn = d / np.linalg.norm(d)
    t = np.clip(((P - a) @ d) / (d @ d), 0, 1)
    q = a + t[..., None] * d
    v = P - q
    v = v - (v @ dn)[..., None] * dn
    r = np.linalg.norm(v, axis=-1)
    e1 = smer0 - (smer0 @ dn) * dn
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(dn, e1)
    phi = np.arctan2(v @ e2, v @ e1)
    return q, phi * r
