# Katedrála sv. Martina (Dóm), Rudnayovo námestie / Dómske námestie / Staromestská – gotický trojloďový halový
# kostol (14.–15. stor.), veža v západnom priečelí bola súčasťou mestského opevnenia (preto bez západného portálu);
# po požiari 1833 dostala okolo roku 1846 neobarokovú medenú helmicu s pozlátenou replikou uhorskej koruny na vankúši
# (85 m), severný portál je neogotický (1893–1895), kaplnka sv. Jána Almužníka barokovo (G. R. Donner, 1729–1732).
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („Dóm sv. Martina“):
#  - pôdorys z OSM (relácia 16609274 a časti: loď 16609266, presbytérium 16609268, veža way 243293986, kaplnka
#    sv. Anny 16609265, kaplnka sv. Jána Almužníka 16609267, predsieň 16609269, schodisková vežička 16609273),
#    výšky z laserového skenovania ÚGKK (DMP/DMR, INSPIRE WMS),
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie): loď z bielej omietky s pieskovcovými
#    opornými piliermi, ostením okien a soklom, ružica pri veži, severný portál so strieškou; presbytérium zo
#    zvetraného pohľadového kameňa s 9 vysokými lomenými oknami s kružbou a piliermi s fialami; južná predsieň
#    z pieskovca s renesančným portálom a plochou plechovou strechou; strmé sedlové strechy z pálenej bobrovky so štítmi,
#    sanktusník na hrebeni presbytéria; veža biela s ružicou, oknom zvonice a hodinami na štvorcovej doske, medená
#    helmica so sukňou, zvonom so 16 pozlátenými rebrami, otvorená lucerna, ihla a pozlátená koruna na vankúši.
# Lokálna sústava: u = os kostola (azimut 71,9°, od veže k presbytériu), v = priečna (azimut 341,9°, na sever),
# začiatok v strede záznamu v pamiatkach. Nula výšky = dlažba pri južnej predsieni.
import math

from veze import Geo, dlzka
from spolocne import material
from presne.snd import Hrana, doska, blok
from presne.reduta import rotacne

OMIETKA, OMIETKA_VEZA, BIELA, KAMEN, KAMEN_TMAVY, SOKEL = '#e8e5de', '#e3dcce', '#f1efe9', '#cfc3aa', '#a0977f', '#9c9584'
STRECHA, STRECHA_PRESB, MED, ZLATO, PLECH = '#b8653f', '#ad5d3c', '#7fa597', '#d4aa55', '#8a8f92'
SKLO, DVERE, CIFERNIK, CIERNA = '#2e3742', '#4a2a20', '#f1eee6', '#1d1d1d'

AZ = math.radians(71.9)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])


def B(u, v):
    return (U[0] * u + V[0] * v, U[1] * u + V[1] * v)


# --- strecha z rovín: konvexný pôdorys, každá hrana má vlastný sklon (None = štít) ---------------------------------

def _orez(poly, a, b, c):
    """Sutherland–Hodgman: časť polygónu, kde a·x + b·y + c <= 0."""
    out = []
    n = len(poly)
    for i in range(n):
        p, q = poly[i], poly[(i + 1) % n]
        fp, fq = a * p[0] + b * p[1] + c, a * q[0] + b * q[1] + c
        if fp <= 1e-9:
            out.append(p)
        if (fp < -1e-9 < fq) or (fq < -1e-9 < fp):
            t = fp / (fp - fq)
            out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def _odsad_hrany(P, d):
    """Konvexný polygón (CCW) s každou hranou posunutou von o d[i]."""
    n = len(P)
    priamky = []
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        L = dlzka(a, b)
        nx, ny = (b[1] - a[1]) / L, -(b[0] - a[0]) / L            # normála von
        priamky.append((nx, ny, nx * a[0] + ny * a[1] + d[i]))
    out = []
    for i in range(n):
        a1, b1, c1 = priamky[i - 1]
        a2, b2, c2 = priamky[i]
        det = a1 * b2 - a2 * b1
        out.append(((c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det) if abs(det) > 1e-9 else P[i])
    return out


def strecha_rovin(G, mat, obrys, z0, sklony, max_h=None, presah=0.0, mat_stit=None, mat_plocha=None):
    """Strecha nad konvexným polygónom (Blender, CCW): rovina každej hrany stúpa dnu so sklonom sklony[i]
    (None = štítová stena v líci múru); max_h = vodorovná plošina; presah = previs odkvapu. Vracia výšku hrebeňa."""
    n = len(obrys)
    roviny = []
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        if sklony[i] is None:
            roviny.append(None)
            continue
        L = dlzka(a, b)
        nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L       # normála dnu (CCW)
        sk = sklony[i]
        roviny.append((sk * nx, sk * ny, z0 - sk * (a[0] * nx + a[1] * ny)))
    if max_h is not None:
        roviny.append((0.0, 0.0, z0 + max_h))
    P = _odsad_hrany(obrys, [0.0 if sk is None else presah for sk in sklony]) if presah else list(obrys)
    platne = [r for r in roviny if r is not None]
    vrch = z0
    tvary = []
    for i, r in enumerate(roviny):
        if r is None:
            continue
        poly = list(P)
        for q in platne:
            if q is r:
                continue
            poly = _orez(poly, r[0] - q[0], r[1] - q[1], r[2] - q[2])
            if len(poly) < 3:
                break
        if len(poly) < 3:
            continue
        body = [(x, y, r[0] * x + r[1] * y + r[2]) for x, y in poly]
        vrch = max(vrch, max(p[2] for p in body))
        G.plocha(mat_plocha if (mat_plocha and i == len(roviny) - 1 and max_h is not None) else mat, body)
        tvary.append(body)
    # štíty: zvislé steny pod strechou na hranách bez sklonu (od výšky odkvapu nahor)
    vyska = lambda x, y: min(q[0] * x + q[1] * y + q[2] for q in platne)
    for i in range(n):
        if sklony[i] is not None:
            continue
        a, b = obrys[i], obrys[(i + 1) % n]       # štít je v líci múru (hrana bez previsu)
        L = dlzka(a, b)
        tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        hore = {0.0: vyska(*a), round(L, 3): vyska(*b)}
        for body in tvary:
            for x, y, z in body:
                d = abs((x - a[0]) * ty - (y - a[1]) * tx)
                t = (x - a[0]) * tx + (y - a[1]) * ty
                if d < 1e-4 and 1e-3 < t < L - 1e-3:
                    k = round(t, 3)
                    hore[k] = max(hore.get(k, -1e9), z)
        vrchy = [(a[0] + tx * t, a[1] + ty * t, z) for t, z in sorted(hore.items(), reverse=True) if z > z0 + 1e-3]
        if vrchy:
            ms = mat_stit.get(i, mat) if isinstance(mat_stit, dict) else (mat_stit or mat)
            G.plocha(ms, [(a[0], a[1], z0), (b[0], b[1], z0)] + vrchy)
    return vrch


# --- gotické prvky --------------------------------------------------------------------------------------------------

def lomeny_obrys(h, s, w, z0, z_pata, von, r_k=1.0, seg=5):
    """Body lomeného (gotického) oblúka: obdĺžnik do z_pata a dva oblúky s polomerom r_k·w."""
    r = max(w * r_k, w / 2 + 1e-3)
    xc = w / 2 - r                         # stred pravého oblúka (posun od osi okna; ľavý je zrkadlový)
    th = math.acos(min(1.0, (r - w / 2) / r))   # uhol, pri ktorom oblúk dosiahne os (vrchol)
    body = [(*h.bod(s - w / 2, von), z0), (*h.bod(s + w / 2, von), z0)]
    for k in range(seg + 1):                       # pravý oblúk zdola po vrchol
        f = th * k / seg
        body.append((*h.bod(s + xc + r * math.cos(f), von), z_pata + r * math.sin(f)))
    for k in range(seg - 1, -1, -1):               # ľavý oblúk z vrcholu nadol
        f = th * k / seg
        body.append((*h.bod(s - xc - r * math.cos(f), von), z_pata + r * math.sin(f)))
    return body


def lomene_okno(G, M, h, s, w, z0, z_pata, ram=0.22, prieciek=2, r_k=1.0, mat_ram=None, ruzica=True):
    """Gotické okno: kamenné ostenie, tmavé (vitrážové) sklo, kamenné priečky a kružba vo vrchole."""
    G.plocha(mat_ram or M['kamen'], lomeny_obrys(h, s, w + 2 * ram, z0 - ram, z_pata, 0.03, r_k))
    G.plocha(M['sklo'], lomeny_obrys(h, s, w, z0, z_pata, 0.06, r_k))
    vrch = z_pata + math.sqrt(max(0.0, (w * r_k) ** 2 - (w * r_k - w / 2) ** 2))
    for k in range(1, prieciek + 1):
        x = -w / 2 + w * k / (prieciek + 1)
        doska(G, mat_ram or M['kamen'], h, s + x, 0.09, z0, z_pata + 0.15, 0.08)
    if ruzica and w > 1.2:
        # kružba: kruh vo vrchole a dva malé lomené oblúky nad priečkami
        rr = w * 0.22
        zc = z_pata + (vrch - z_pata) * 0.48
        body = [(*h.bod(s + rr * math.cos(2 * math.pi * k / 10), 0.085), zc + rr * math.sin(2 * math.pi * k / 10)) for k in range(10)]
        G.plocha(mat_ram or M['kamen'], body)
        body = [(*h.bod(s + rr * 0.62 * math.cos(2 * math.pi * k / 10), 0.095), zc + rr * 0.62 * math.sin(2 * math.pi * k / 10)) for k in range(10)]
        G.plocha(M['sklo'], body)
    # parapet (odkvapová rímsa)
    blok(G, mat_ram or M['kamen'], h, s, w + 2 * ram + 0.2, 0.22, z0 - ram - 0.18, z0 - ram + 0.02)


def blok_so_strieskou(G, mat, h, s, w, d, z0, z1, sklon_h, von0=0.0):
    """Stupeň oporného piliera: kváder w × d pred stenou so šikmým vrchom (vpredu z1, pri stene z1 + sklon_h)."""
    a0, b0 = h.bod(s - w / 2, von0), h.bod(s + w / 2, von0)
    a1, b1 = h.bod(s - w / 2, von0 + d), h.bod(s + w / 2, von0 + d)
    G.plocha(mat, [(*a1, z0), (*b1, z0), (*b1, z1), (*a1, z1)])                       # čelo
    G.plocha(mat, [(*a0, z0), (*a1, z0), (*a1, z1), (*a0, z1 + sklon_h)])             # ľavý bok
    G.plocha(mat, [(*b1, z0), (*b0, z0), (*b0, z1 + sklon_h), (*b1, z1)])             # pravý bok
    G.plocha(mat, [(*a1, z1), (*b1, z1), (*b0, z1 + sklon_h), (*a0, z1 + sklon_h)])   # šikmý vrch


def fiala(G, mat, c, z, w, vyska):
    """Gotická fiala: hranolček a štvorboký ihlan (c = stred, Blender)."""
    G.kvader(mat, c, U, w, w, z, z + vyska * 0.35)
    hw = w / 2 + 0.04
    rohy = [(c[0] + (U[0] * a + V[0] * b) * hw, c[1] + (U[1] * a + V[1] * b) * hw) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    zv = z + vyska
    for i in range(4):
        p, q = rohy[i], rohy[(i + 1) % 4]
        G.plocha(mat, [(*p, z + vyska * 0.35), (*q, z + vyska * 0.35), (c[0], c[1], zv)])


def pilier_v_bode(G, mat, c_uv, smer_uv, w, stupne, fiala_h=0.0, zapust=0.3):
    """Oporný pilier (napr. diagonálny na nároží) s pätou v bode c_uv, smerom von smer_uv."""
    n = (U[0] * smer_uv[0] + V[0] * smer_uv[1], U[1] * smer_uv[0] + V[1] * smer_uv[1])
    L = math.hypot(*n)
    n = (n[0] / L, n[1] / L)
    t = (-n[1], n[0])
    c = B(*c_uv)
    a = (c[0] - t[0] * w / 2 - n[0] * zapust, c[1] - t[1] * w / 2 - n[1] * zapust)
    b = (c[0] + t[0] * w / 2 - n[0] * zapust, c[1] + t[1] * w / 2 - n[1] * zapust)
    oporny_pilier(G, mat, Hrana(a, b), w / 2, w, 0, [(z, d + zapust) for z, d in stupne], fiala_h=fiala_h)


def oporny_pilier(G, mat, h, s, w, d, stupne, fiala_h=0.0, mat_fiala=None):
    """Oporný pilier zo stupňov [(z_vrch, hĺbka), …] zdola nahor; voliteľne fiala na vrchole."""
    z = -1.0
    for z1, dd in stupne:
        blok_so_strieskou(G, mat, h, s, w, dd, z, z1, min(0.6, dd * 0.5))
        z = z1
    if fiala_h:
        c = h.bod(s, stupne[-1][1] * 0.45)
        fiala(G, mat_fiala or mat, c, z + 0.3, w * 0.55, fiala_h)


# --- rozmery (m nad dlažbou pri južnej predsieni) ------------------------------------------------------------------

# Laser (DMP, mriežka 1 m; o ~0,9 m posunutý na juh voči OSM): hrebeň lode 184,9 m n. m. – 145,8 = 39,1 m, sklon 60°,
# hrebeň presbytéria 34,2 m, sklon 64°, sanktusník 40,2 m, rímsa veže ~51,8 m, zvon helmice do ~61,7 m, lucerna
# do 69,4 m, vrchol koruny 86,0 m; predsieň 7,4 m (takmer plochá), kaplnka sv. Anny pultová 9,5 → 14,3 m,
# kaplnka sv. Jána kupola 18,8 m a lucerna 22,3 m. Terén: sever 146,4 (+0,6), juhozápad pod vežou až 140,2 (−5,6).
Z_PATA = -6.0                                   # spodok múrov (terén pod vežou je o 5,6 m nižší)
Z_SOKEL = 1.1
Z_RIMSA_LOD, Z_HREBEN_LOD = 15.4, 39.1
SKLON_LOD = (Z_HREBEN_LOD - Z_RIMSA_LOD) / 13.9
Z_RIMSA_PRESB, Z_HREBEN_PRESB = 21.4, 34.2
SKLON_PRESB = (Z_HREBEN_PRESB - Z_RIMSA_PRESB) / 6.15
Z_VEZA_PAS, Z_VEZA_RIMSA = 30.5, 52.0           # pás nad strechou lode (pri bokoch veže), hlavná rímsa veže
Z_HELMICA, Z_LUCERNA, Z_IHLA, Z_KORUNA = 63.0, 69.4, 83.9, 86.0

# pôdorysy (u, v) proti smeru hodinových ručičiek
# severná stena lode je v OSM mierne zošikmená (v 13,2 → 14,8); hrebeň je vodorovný, preto je tu vyrovnaná na 13,95
LOD = [(-31.45, -13.88), (12.32, -13.85), (13.02, -12.65), (13.95, 13.95), (-29.65, 13.95), (-31.45, 12.3)]
LOD_STRECHA = [(-31.45, -13.88), (13.0, -13.86), (13.95, 13.95), (-31.45, 13.95)]
PRESB = [(13.21, -7.02), (35.8, -7.6), (41.5, -5.0), (41.95, 1.4), (37.5, 4.3), (13.66, 5.5)]
PRESB_STRECHA = [(6.0, -6.8), (35.8, -7.6), (41.5, -5.0), (41.95, 1.4), (37.5, 4.3), (6.0, 5.75)]
VEZA = [(-31.45, -6.47), (-21.5, -6.49), (-21.6, 5.45), (-31.45, 5.53)]
PREDSIEN = [(-8.47, -13.87), (-8.0, -19.3), (-0.9, -19.3), (-0.75, -13.86)]
KAPLNKA_ANNY = [(-8.5, 13.95), (6.11, 13.95), (6.13, 17.86), (-8.42, 18.19)]
KAPLNKA_JANA = [(13.66, 5.5), (22.11, 5.38), (19.81, 13.05), (13.93, 13.22)]
# oporné piliere: (u, v) päty na stene, smer von (±1 = juh/sever) a šírka; diagonálne na nárožiach osobitne
PILIERE_LOD_JUH = [-25.9, -20.55, -14.1, 5.22]
PILIERE_LOD_SEVER = [-22.0, -14.6, 8.8]
SCHODISKO_SZ = (-30.9, 13.5)            # polygonálna schodisková vežička na SZ nároží (OSM 16609273)
PILIERE_PRESB = [(19.7, -1), (25.1, -1), (30.9, -1), (19.0, 1), (25.3, 1), (31.2, 1)]
PILIERE_APSIDA = [((36.45, -7.5), (0.32, -0.95)), ((41.37, -4.94), (0.91, -0.42)), ((41.63, 1.0), (0.9, 0.45)),
                  ((37.0, 4.1), (0.32, 0.95))]


def obrys_b(uv):
    return [B(u, v) for u, v in uv]


def hrany_b(uv):
    b = obrys_b(uv)
    return [Hrana(b[i], b[(i + 1) % len(b)]) for i in range(len(b))]


def hrana_uv(a, b):
    return Hrana(B(*a), B(*b))


def steny(G, mat, uv, z0, z1, mat_sokel=None, z_sokel=Z_SOKEL):
    z0 = min(z0, Z_PATA)
    b = obrys_b(uv)
    for i in range(len(b)):
        p, q = b[i], b[(i + 1) % len(b)]
        if mat_sokel:
            G.stena(mat_sokel, p, q, z0, z_sokel)
            G.stena(mat, p, q, z_sokel, z1)
        else:
            G.stena(mat, p, q, z0, z1)


def rimsa(G, mat, uv, z, vyska=0.45, von=0.35):
    G.pas(mat, obrys_b(uv), z - vyska, z, von)


def sokel(G, mat, uv, z1=Z_SOKEL, von=0.12):
    G.pas(mat, obrys_b(uv), Z_PATA, z1, von, spodok=False)


def vikiere(G, M, hrany_uv, z0, sklon, rady, krok=6.0):
    """Malé vetracie vikiere (volské oká) na strane strechy: hrany_uv = [(a, b)] odkvapov (CCW), rady = vodorovné
    vzdialenosti od odkvapu."""
    for a_uv, b_uv in hrany_uv:
        h = hrana_uv(a_uv, b_uv)
        for k, d in enumerate(rady):
            n = max(1, int((h.L - 6) / krok))
            for j in range(n):
                s = 3 + (h.L - 6) * (j + 0.5 + 0.35 * (k % 2)) / (n + 0.35 * (k % 2))
                z = z0 + sklon * d
                w, vys = 0.7, 0.55
                l, r = h.bod(s - w / 2, -d + 0.05), h.bod(s + w / 2, -d + 0.05)
                m = h.bod(s, -d + 0.05)
                t = h.bod(s, -d - vys / sklon)
                G.plocha(M['sklo'], [(*l, z), (*r, z), (*m, z + vys * 0.8)])
                G.plocha(M['strecha'], [(*l, z), (*m, z + vys), (*t, z + vys)])
                G.plocha(M['strecha'], [(*m, z + vys), (*r, z), (*t, z + vys)])


# --- loď ------------------------------------------------------------------------------------------------------------

# okná lode: (index hrany v LOD, poloha u alebo v stredu, šírka, typ) – juh podľa fotiek z Rudnayovho nám.
OKNA_LOD_JUH = [(-26.2, 'okno'), (-17.3, 'ruzica'), (-10.9, 'okno'), (-4.6, 'nad_predsienou'), (1.9, 'okno'),
                (9.2, 'okno')]
# sever: hlavný portál (1893–1895) v 2. poli od veže, kaplnka sv. Anny medzi 3. a 4. pilierom
OKNA_LOD_SEVER = [(-26.8, 'okno'), (-18.3, 'portal'), (-11.5, 'okno'), (-4.0, 'nad_kaplnkou'), (2.5, 'nad_kaplnkou'),
                  (11.3, 'okno')]


def postav_lod(G, M):
    steny(G, M['omietka'], LOD, Z_PATA, Z_RIMSA_LOD, mat_sokel=M['kamen'])
    sokel(G, M['sokel'], LOD)
    rimsa(G, M['kamen'], LOD, Z_RIMSA_LOD, 0.5, 0.4)
    # okná na južnej a severnej stene
    hj = hrana_uv(LOD[0], LOD[1])
    u0 = LOD[0][0]
    for u, typ in OKNA_LOD_JUH:
        s = (u - u0) / (LOD[1][0] - u0) * hj.L
        if typ == 'okno':
            lomene_okno(G, M, hj, s, 1.9, 4.4, 11.0, prieciek=1)
        elif typ == 'ruzica':
            ruzica(G, M, hj, s, 10.9, 1.35)
            lomene_okno(G, M, hj, s, 1.1, 4.4, 7.9, prieciek=1)
        else:
            lomene_okno(G, M, hj, s, 1.8, 8.8, 11.4, prieciek=1)
    hs = hrana_uv(LOD[3], LOD[4])
    for u, typ in OKNA_LOD_SEVER:
        s = (LOD[3][0] - u) / (LOD[3][0] - LOD[4][0]) * hs.L
        if typ == 'okno':
            lomene_okno(G, M, hs, s, 1.9, 4.4, 11.0, prieciek=1)
        elif typ == 'portal':
            portal_sever(G, M, hs, s)
            lomene_okno(G, M, hs, s, 1.6, 8.6, 11.2, prieciek=1, ruzica=False)
        else:
            lomene_okno(G, M, hs, s, 1.6, 11.0, 12.6, prieciek=1, ruzica=False)
    for u in PILIERE_LOD_SEVER:
        s = (LOD[3][0] - u) / (LOD[3][0] - LOD[4][0]) * hs.L
        oporny_pilier(G, M['kamen'], hs, s, 1.2, 1.4, [(7.5, 1.4), (11.5, 0.95)])
    # oporné piliere juh (štíhle, so strieškou v 2/3 výšky) a nárožné na západe
    for u in PILIERE_LOD_JUH:
        s = (u - u0) / (LOD[1][0] - u0) * hj.L
        oporny_pilier(G, M['kamen'], hj, s, 1.25, 1.6, [(7.5, 1.6), (11.5, 1.05)])
    pilier_v_bode(G, M['kamen'], (-31.45, -13.88), (-0.71, -0.71), 1.4, [(6.0, 1.9), (11.0, 1.35), (14.8, 0.8)])
    schodiskova_vezicka(G, M, B(*SCHODISKO_SZ))
    # západná stena pri veži (piliere veže)
    for v in (-5.3, 4.45):
        h = hrana_uv((-31.45, v + 1.1), (-31.45, v - 1.1))
        oporny_pilier(G, M['kamen'], h, 1.1, 2.1, 1.8, [(9.0, 1.8), (17.0, 1.3), (25.0, 0.8)])
    # strecha: sedlová so štítmi na oboch koncoch (laser), veža prechádza západným štítom
    vrch = strecha_rovin(G, M['strecha'], obrys_b(LOD_STRECHA), Z_RIMSA_LOD,
                         [SKLON_LOD, None, SKLON_LOD, None], presah=0.45, mat_stit={1: M['kamen_tmavy'], 3: M['omietka_veza']})
    hrany = [(LOD_STRECHA[0], LOD_STRECHA[1]), (LOD_STRECHA[2], LOD_STRECHA[3])]
    vikiere(G, M, hrany, Z_RIMSA_LOD, SKLON_LOD, [2.4, 6.6, 10.6], krok=8.0)
    return vrch


def portal_sever(G, M, h, s):
    """Hlavný severný portál: lomený oblúk v kamennom ráme, kovaná brána, strieška zo škridly a schodíky."""
    G.plocha(M['kamen'], lomeny_obrys(h, s, 3.4, 0.0, 4.0, 0.06, r_k=0.8))
    blok(G, M['kamen'], h, s - 1.95, 0.5, 0.45, Z_PATA, 5.6)
    blok(G, M['kamen'], h, s + 1.95, 0.5, 0.45, Z_PATA, 5.6)
    G.plocha(M['dvere'], lomeny_obrys(h, s, 2.1, 0.0, 3.0, 0.1, r_k=0.8))
    for k in range(-3, 4):
        doska(G, M['zelezo'], h, s + k * 0.28, 0.05, 0.0, 3.0 + 0.9 * (1 - abs(k) / 4), 0.13)
    a, b = h.bod(s - 2.3, 1.2), h.bod(s + 2.3, 1.2)
    c, d = h.bod(s + 2.3, 0.0), h.bod(s - 2.3, 0.0)
    G.plocha(M['strecha'], [(*a, 5.7), (*b, 5.7), (*c, 6.5), (*d, 6.5)])
    G.plocha(M['strecha'], [(*a, 5.7), (*d, 6.5), (*d, 5.7)])
    G.plocha(M['strecha'], [(*b, 5.7), (*c, 5.7), (*c, 6.5)])
    for k in range(3):
        G.kvader(M['sokel'], h.bod(s, 0.35 * (k + 0.5)), h.t, 4.0 - 0.3 * k, 0.35, -1.5, -0.17 * k)


def schodiskova_vezicka(G, M, c):
    """Polygonálna schodisková vežička na SZ nároží lode s kamennou ihlou (~13 m)."""
    nat = math.atan2(U[1], U[0]) + math.pi / 8
    rotacne(G, M['kamen'], c, [(1.5, Z_PATA), (1.5, 10.6)], seg=8, natocenie=nat)
    rotacne(G, M['kamen'], c, [(1.5, 10.6), (1.7, 10.75), (1.7, 11.0), (1.5, 11.0)], seg=8, natocenie=nat)
    rotacne(G, M['kamen'], c, [(1.4, 11.0), (0.12, 14.6), (0.0, 14.8)], seg=8, natocenie=nat)
    for z in (3.0, 6.0, 8.8):
        for i in (2, 3):              # okienka na SZ a Z
            f = nat + 2 * math.pi * (i + 0.5) / 8
            G.kvader(M['sklo'], (c[0] + 1.52 * math.cos(f), c[1] + 1.52 * math.sin(f)), (-math.sin(f), math.cos(f)),
                     0.22, 0.03, z, z + 0.9)


def ruzica(G, M, h, s, zc, r, mat=None):
    """Okrúhle okno s kružbou (ružica)."""
    k = mat or M['kamen']
    kruh = lambda rr, von, n=16: [(*h.bod(s + rr * math.cos(2 * math.pi * i / n), von), zc + rr * math.sin(2 * math.pi * i / n)) for i in range(n)]
    G.plocha(k, kruh(r + 0.22, 0.03))
    G.plocha(M['sklo'], kruh(r, 0.06))
    for i in range(6):
        f = math.pi * i / 6
        a = (*h.bod(s - r * math.cos(f), 0.08), zc - r * math.sin(f))
        b = (*h.bod(s + r * math.cos(f), 0.08), zc + r * math.sin(f))
        G.tram(k, a, b, 0.08)
    G.plocha(k, kruh(r * 0.25, 0.1, 8))


# --- presbytérium --------------------------------------------------------------------------------------------------

def postav_presbyterium(G, M):
    steny(G, M['kamen_tmavy'], PRESB, Z_PATA, Z_RIMSA_PRESB, mat_sokel=M['sokel'])
    rimsa(G, M['kamen_tmavy'], PRESB, Z_RIMSA_PRESB, 0.55, 0.45)
    hr = hrany_b(PRESB)
    # okná: dlhé steny 3 + 1 na juhu, 2 na severe (kaplnka), apsida 3
    juh, apsida_s, apsida_v, apsida_j, sever = hr[0], hr[1], hr[2], hr[3], hr[4]
    for s in (3.5, 9.0, 14.6, 20.3):
        lomene_okno(G, M, juh, s, 2.4, 5.0, 15.8, mat_ram=M['kamen_tmavy'])
    for s in (3.3, 9.2):
        lomene_okno(G, M, sever, s, 2.4, 5.0, 15.8, mat_ram=M['kamen_tmavy'])
    for h in (apsida_s, apsida_v, apsida_j):
        lomene_okno(G, M, h, h.L / 2, min(2.4, h.L - 1.6), 5.0, 15.8, mat_ram=M['kamen_tmavy'])
    # oporné piliere so stupňami a fialami
    stupne = [(7.0, 2.6), (12.5, 2.0), (16.8, 1.35)]
    for u, strana in PILIERE_PRESB:
        h = juh if strana < 0 else sever
        a = h.a
        du = (B(u, 0)[0] - a[0]) * h.t[0] + (B(u, 0)[1] - a[1]) * h.t[1]
        s = du if strana < 0 else du
        oporny_pilier(G, M['kamen_tmavy'], h, s, 1.6, 2.6, stupne, fiala_h=2.2)
    for c, smer in PILIERE_APSIDA:
        pilier_v_bode(G, M['kamen_tmavy'], c, smer, 1.6, stupne, fiala_h=2.2)
    vrch = strecha_rovin(G, M['strecha_presb'], obrys_b(PRESB_STRECHA), Z_RIMSA_PRESB,
                         [SKLON_PRESB] * 5 + [None], presah=0.4, mat_stit=M['omietka'])
    vikiere(G, M, [((14.5, -7.06), (35.8, -7.6)), ((37.5, 4.3), (14.5, 5.45))], Z_RIMSA_PRESB, SKLON_PRESB, [2.2], krok=6.5)
    sanktusnik(G, M, B(34.5, -1.4), vrch - 0.6)
    return vrch


def sanktusnik(G, M, c, z):
    """Sanktusník – štíhla vežička na hrebeni presbytéria (tmavý plech, cibuľka, ihla s krížom)."""
    rotacne(G, M['plech'], c, [(0.75, z - 1.0), (0.75, z + 2.2), (0.95, z + 2.4), (0.55, z + 2.7)], seg=8)
    for i in range(8):
        f = 2 * math.pi * (i + 0.5) / 8
        p = (c[0] + 0.77 * math.cos(f), c[1] + 0.77 * math.sin(f))
        G.kvader(M['sklo'], p, (-math.sin(f), math.cos(f)), 0.35, 0.04, z + 0.6, z + 1.8)
    rotacne(G, M['plech'], c, [(0.55, z + 2.7), (0.7, z + 3.1), (0.62, z + 3.5), (0.3, z + 3.8), (0.12, z + 4.0), (0.12, z + 4.4),
                               (0.0, z + 6.2)], seg=8)
    kriz(G, M['zlato'], c, z + 6.2, 1.0)


def kriz(G, mat, c, z, vys):
    G.kvader(mat, c, U, 0.08, 0.08, z, z + vys)
    G.kvader(mat, c, U, vys * 0.55, 0.08, z + vys * 0.62, z + vys * 0.72)


# --- veža -----------------------------------------------------------------------------------------------------------

def postav_vezu(G, M):
    b = obrys_b(VEZA)
    G.hranol(M['omietka_veza'], b, Z_PATA, Z_VEZA_RIMSA, vrch=False)
    sokel(G, M['sokel'], VEZA)
    hr = hrany_b(VEZA)
    # nárožné kvádre (pieskovec) a pás nad strechou lode
    for h in hr:
        for s in (0.35, h.L - 0.35):
            blok(G, M['kamen'], h, s, 0.7, 0.06, Z_VEZA_PAS, Z_VEZA_RIMSA - 0.8)
    G.pas(M['kamen'], b, Z_VEZA_PAS - 0.35, Z_VEZA_PAS, 0.18)
    # hlavná rímsa veže (dva stupne)
    G.pas(M['omietka_veza'], b, Z_VEZA_RIMSA - 0.8, Z_VEZA_RIMSA - 0.35, 0.25)
    G.pas(M['omietka_veza'], b, Z_VEZA_RIMSA - 0.35, Z_VEZA_RIMSA, 0.6)
    G.pas(M['kamen'], b, 36.55, 36.8, 0.12)
    # na každej strane: ružica, lomené okno s kružbou, ciferník
    for h in hr:
        s = h.L / 2
        ruzica(G, M, h, s, 34.0, 1.1)
        lomene_okno(G, M, h, s, 2.8, 37.6, 43.1, prieciek=2, ram=0.25)
        cifernik(G, M, h, s, 48.0, 1.25)
    # západné priečelie pod strechou: vysoké okno (portál tu nie je – veža bola súčasťou hradieb)
    zap = hr[3]
    lomene_okno(G, M, zap, zap.L / 2, 2.2, 19.1, 23.6, prieciek=2)
    postav_helmicu(G, M, ((b[0][0] + b[2][0]) / 2, (b[0][1] + b[2][1]) / 2))


def cifernik(G, M, h, s, zc, r):
    """Hodiny: biela štvorcová doska (2,5 m), čierne rímske číslice (čiarky), pozlátené ručičky."""
    kruh = lambda rr, von, n=20: [(*h.bod(s + rr * math.cos(2 * math.pi * i / n), von), zc + rr * math.sin(2 * math.pi * i / n)) for i in range(n)]
    doska(G, M['kamen'], h, s, 2 * r + 0.2, zc - r - 0.1, zc + r + 0.1, 0.04)
    doska(G, M['cifernik'], h, s, 2 * r, zc - r, zc + r, 0.07)
    G.plocha(M['cierna'], kruh(r * 0.97, 0.075, 24))
    G.plocha(M['cifernik'], kruh(r * 0.9, 0.08, 24))
    for i in range(12):
        f = 2 * math.pi * i / 12
        a = (*h.bod(s + r * 0.78 * math.cos(f), 0.09), zc + r * 0.78 * math.sin(f))
        c = (*h.bod(s + r * 0.92 * math.cos(f), 0.09), zc + r * 0.92 * math.sin(f))
        G.tram(M['cierna'], a, c, 0.07)
    # ručičky (zlaté) – 10:10
    for uhol, dl in ((math.radians(150), 0.5), (math.radians(30), 0.72)):
        a = (*h.bod(s, 0.11), zc)
        c = (*h.bod(s + r * dl * math.cos(uhol), 0.11), zc + r * dl * math.sin(uhol))
        G.tram(M['zlato'], a, c, 0.08)


def postav_helmicu(G, M, c):
    """Medená zvonová helmica s pozlátenými rebrami, otvorená lucerna, ihla so zlatými krúžkami, koruna na vankúši."""
    z = Z_VEZA_RIMSA
    nat = math.atan2(U[1], U[0]) + math.pi / 8     # osemuholník natočený podľa veže
    # sukňa: zo štvorca rímsy do osemuholníka (štyri lichobežníky a štyri trojuholníky)
    hw = 6.2                                       # roztiahnutá štvorcová sukňa (~12,5 m pri odkvape)
    stv = [(c[0] + (U[0] * a + V[0] * bb) * hw, c[1] + (U[1] * a + V[1] * bb) * hw) for a, bb in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    r0, z1 = 4.75, z + 2.8
    osem = [(c[0] + r0 * math.cos(nat + 2 * math.pi * i / 8), c[1] + r0 * math.sin(nat + 2 * math.pi * i / 8)) for i in range(8)]
    for i in range(4):
        p, q = stv[i], stv[(i + 1) % 4]
        # strana i štvorca leží medzi uhlami 225° + 90°·i a 315° + 90°·i od osi U → vrcholy osemuholníka 5+2i, 6+2i
        k5, k6, k7 = osem[(5 + 2 * i) % 8], osem[(6 + 2 * i) % 8], osem[(7 + 2 * i) % 8]
        G.plocha(M['med'], [(*p, z), (*q, z), (*k6, z1), (*k5, z1)])
        G.plocha(M['med'], [(*q, z), (*k7, z1), (*k6, z1)])
    # zvon: šestnásťboký, prehnutý profil so 16 pozlátenými rebrami, zlatý pás pri päte a gotický pás pod hrdlom
    hz = Z_HELMICA - z1
    prof = [(4.75, z1), (4.85, z1 + 0.13 * hz), (4.65, z1 + 0.3 * hz), (4.1, z1 + 0.49 * hz), (3.3, z1 + 0.66 * hz),
            (2.5, z1 + 0.8 * hz), (2.1, z1 + 0.89 * hz), (1.95, z1 + 0.95 * hz), (1.95, Z_HELMICA)]
    rotacne(G, M['med'], c, prof, seg=16, natocenie=nat, rebra=1, mat_rebra=M['zlato'], hrubka_rebra=0.13)
    rotacne(G, M['zlato'], c, [(4.3, z1), (4.87, z1), (4.87, z1 + 0.3), (4.8, z1 + 0.32)], seg=16, natocenie=nat)
    rotacne(G, M['zlato'], c, [(2.45, z1 + 0.81 * hz), (2.12, z1 + 0.9 * hz), (2.0, z1 + 0.96 * hz)], seg=16, natocenie=nat)
    for i in range(16):
        f = nat + 2 * math.pi * (i + 0.5) / 16
        p = (c[0] + 2.75 * math.cos(f), c[1] + 2.75 * math.sin(f))
        G.plocha(M['zlato'], [(p[0] - 0.28 * math.sin(f), p[1] + 0.28 * math.cos(f), z1 + 0.74 * hz),
                              (p[0] + 0.28 * math.sin(f), p[1] - 0.28 * math.cos(f), z1 + 0.74 * hz),
                              (c[0] + 2.4 * math.cos(f), c[1] + 2.4 * math.sin(f), z1 + 0.83 * hz)])
    # lucerna (~4 m): osem stĺpikov s tmavými lomenými otvormi, rímsa
    zl0, zl1 = Z_HELMICA, Z_LUCERNA - 1.0
    rl = 1.9
    rotacne(G, M['tma'], c, [(rl - 0.25, zl0), (rl - 0.25, zl1)], seg=8, natocenie=nat)
    for i in range(8):
        f = nat + 2 * math.pi * i / 8
        p = (c[0] + rl * math.cos(f), c[1] + rl * math.sin(f))
        G.kvader(M['med'], p, (-math.sin(f), math.cos(f)), 0.32, 0.3, zl0, zl1)
        q = (c[0] + (rl - 0.05) * math.cos(f + math.pi / 8), c[1] + (rl - 0.05) * math.sin(f + math.pi / 8))
        G.kvader(M['zlato'], q, (-math.sin(f + math.pi / 8), math.cos(f + math.pi / 8)), 0.9, 0.06, zl1 - 0.6, zl1 - 0.45)
    rotacne(G, M['med'], c, [(1.95, zl1), (2.25, zl1 + 0.3), (2.25, zl1 + 0.5), (1.85, zl1 + 0.7), (1.6, Z_LUCERNA)],
            seg=8, natocenie=nat)
    rotacne(G, M['zlato'], c, [(2.27, zl1 + 0.3), (2.27, zl1 + 0.5)], seg=8, natocenie=nat)
    # ihla: osemboký ihlan (pri päte ~3,3 m) so zlatými krúžkami
    zi = Z_LUCERNA
    rotacne(G, M['med'], c, [(1.6, zi), (0.18, Z_IHLA - 0.4), (0.12, Z_IHLA)], seg=8, natocenie=nat)
    for t in (0.1, 0.3, 0.5, 0.7):
        zz = zi + (Z_IHLA - 0.4 - zi) * t
        rr = 1.6 + (0.18 - 1.6) * t
        rotacne(G, M['zlato'], c, [(rr + 0.05, zz), (rr + 0.04, zz + 0.3)], seg=8, natocenie=nat)
    koruna(G, M, c, Z_IHLA)


def koruna(G, M, c, z):
    """Pozlátená replika uhorskej koruny na vankúši (vankúš 1,2 × 1,2 × 0,5 m, koruna ~1 m široká, šikmý krížik;
    spolu 1,64 m a 300 kg)."""
    z0 = z
    G.kvader(M['zlato'], c, U, 0.3, 0.3, z0, z0 + 0.2)
    vz = z0 + 0.2
    # vankúš: zaoblený kváder so strapcami na rohoch
    rotacne(G, M['zlato'], c, [(0.0, vz), (0.76, vz + 0.02), (0.86, vz + 0.14), (0.83, vz + 0.36), (0.64, vz + 0.48), (0.0, vz + 0.5)],
            seg=4, natocenie=math.atan2(U[1], U[0]) + math.pi / 4)
    for a, bb in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        p = (c[0] + (U[0] * a + V[0] * bb) * 0.58, c[1] + (U[1] * a + V[1] * bb) * 0.58)
        G.valec(M['zlato'], p, 0.07, vz - 0.18, vz + 0.04, seg=6, r1=0.02)
    kz = vz + 0.48
    # obruč a oblúky koruny
    rotacne(G, M['zlato'], c, [(0.48, kz), (0.5, kz + 0.38), (0.0, kz + 0.38)], seg=12)
    for f in (0.0, math.pi / 2):
        d = (math.cos(f) * U[0] - math.sin(f) * U[1], math.cos(f) * U[1] + math.sin(f) * U[0])
        body = [(c[0] + d[0] * 0.48 * math.cos(k * math.pi / 6), c[1] + d[1] * 0.48 * math.cos(k * math.pi / 6),
                 kz + 0.38 + 0.42 * math.sin(k * math.pi / 6)) for k in range(7)]
        for p, q in zip(body, body[1:]):
            G.tram(M['zlato'], p, q, 0.1)
    # šikmý krížik na vrchu
    vrch = (c[0], c[1], kz + 0.8)
    kon = (c[0] + U[0] * 0.12, c[1] + U[1] * 0.12, kz + 1.25)
    G.tram(M['zlato'], vrch, kon, 0.07)
    mid = (vrch[0] * 0.4 + kon[0] * 0.6, vrch[1] * 0.4 + kon[1] * 0.6, vrch[2] * 0.4 + kon[2] * 0.6)
    G.tram(M['zlato'], (mid[0] - V[0] * 0.16, mid[1] - V[1] * 0.16, mid[2]), (mid[0] + V[0] * 0.16, mid[1] + V[1] * 0.16, mid[2]), 0.06)


# --- predsieň a kaplnky ---------------------------------------------------------------------------------------------

Z_PREDSIEN = 7.0


def postav_predsien(G, M):
    steny(G, M['kamen'], PREDSIEN, Z_PATA, Z_PREDSIEN, mat_sokel=M['sokel'])
    rimsa(G, M['kamen'], PREDSIEN[:3], Z_PREDSIEN, 0.4, 0.3)
    hr = hrany_b(PREDSIEN)
    zap, juh = hr[0], hr[1]
    # južný portál: dvere s lomeným oblúkom v bohatom ráme s trojuholníkovým štítom, okrúhle okno
    s = juh.L / 2 + 0.6
    blok(G, M['kamen'], juh, s, 3.0, 0.25, 0.0, 4.3)
    G.plocha(M['dvere'], lomeny_obrys(juh, s, 1.6, 0.0, 2.5, 0.27, r_k=0.62))
    for k in (-1, 1):
        blok(G, M['kamen'], juh, s + k * 1.35, 0.32, 0.4, 0.0, 4.3)
    tri = [(*juh.bod(s - 1.7, 0.3), 4.3), (*juh.bod(s + 1.7, 0.3), 4.3), (*juh.bod(s, 0.3), 5.5)]
    G.plocha(M['kamen'], tri)
    G.plocha(M['kamen'], [(*juh.bod(s - 1.7, 0.0), 4.3), (*juh.bod(s - 1.7, 0.3), 4.3), (*juh.bod(s, 0.3), 5.5), (*juh.bod(s, 0.0), 5.5)])
    G.plocha(M['kamen'], [(*juh.bod(s, 0.0), 5.5), (*juh.bod(s, 0.3), 5.5), (*juh.bod(s + 1.7, 0.3), 4.3), (*juh.bod(s + 1.7, 0.0), 4.3)])
    ruzica(G, M, juh, s - 2.4, 5.0, 0.45)
    lomene_okno(G, M, zap, zap.L * 0.55, 1.0, 2.9, 4.4, prieciek=1, ruzica=False)
    G.plocha(M['dvere'], lomeny_obrys(zap, zap.L * 0.25, 1.05, 0.0, 2.2, 0.05, r_k=0.7))
    for c, smer in (((-8.0, -19.3), (-0.71, -0.71)), ((-0.9, -19.3), (0.71, -0.71))):
        pilier_v_bode(G, M['kamen'], c, smer, 0.8, [(4.0, 0.9), (6.4, 0.55)], fiala_h=1.6)
    strecha_rovin(G, M['plech_strecha'], obrys_b(PREDSIEN), Z_PREDSIEN, [0.1, 0.1, 0.1, None], presah=0.25)
    # schody pred portálom
    for k in range(5):
        G.kvader(M['sokel'], B(-4.4, -19.3 - 0.35 * (k + 0.5)), U, 9.5, 0.35, -2.0, -0.18 * (k + 1))


def postav_kaplnky(G, M):
    # kaplnka sv. Anny (sever, barok): biela omietka, valbová strecha z škridly
    steny(G, M['kamen'], KAPLNKA_ANNY, Z_PATA, 9.5, mat_sokel=M['sokel'])
    rimsa(G, M['kamen'], KAPLNKA_ANNY, 9.5, 0.45, 0.35)
    hr = hrany_b(KAPLNKA_ANNY)
    for s in (3.6, 7.3, 11.0):
        lomene_okno(G, M, hr[2], s, 1.5, 3.5, 7.2, prieciek=1, ruzica=False)
    strecha_rovin(G, M['strecha'], obrys_b(KAPLNKA_ANNY), 9.5, [None, None, 1.14, None], presah=0.3, mat_stit=M['kamen'])
    # kaplnka sv. Jána Almužníka (G. R. Donner, 1729–1732): kamenný múr, medená kupola s lucernou
    steny(G, M['biela'], KAPLNKA_JANA, Z_PATA, 11.2, mat_sokel=M['kamen'])
    rimsa(G, M['biela'], KAPLNKA_JANA, 11.2, 0.5, 0.4)
    hr = hrany_b(KAPLNKA_JANA)
    for h in hr[1:3]:
        for k in (-1, 1):                          # párové pilastre
            for ds in (-0.5, 0.5):
                blok(G, M['biela'], h, h.L / 2 + k * (h.L / 2 - 0.9) + ds * 0.7, 0.45, 0.2, Z_PATA, 10.7)
    sv = hr[2]
    G.plocha(M['kamen'], lomeny_obrys(sv, sv.L / 2, 1.9, 4.0, 7.8, 0.03, r_k=0.5))
    G.plocha(M['sklo'], lomeny_obrys(sv, sv.L / 2, 1.5, 4.2, 7.8, 0.06, r_k=0.5))
    strecha_rovin(G, M['med'], obrys_b(KAPLNKA_JANA), 11.2, [0.8, 0.8, 0.8, 0.8], max_h=1.0, presah=0.3)
    c = B(17.0, 9.3)
    rotacne(G, M['med'], c, [(3.4, 12.1), (3.3, 13.4), (2.95, 14.9), (2.3, 16.4), (1.4, 17.7), (0.75, 18.5)], seg=12)
    rotacne(G, M['biela'], c, [(0.75, 18.5), (0.75, 20.4), (0.88, 20.55)], seg=8)
    rotacne(G, M['med'], c, [(0.88, 20.55), (0.5, 20.9), (0.15, 21.3), (0.0, 21.5)], seg=8)
    for i in range(8):
        f = 2 * math.pi * (i + 0.5) / 8
        G.kvader(M['tma'], (c[0] + 0.77 * math.cos(f), c[1] + 0.77 * math.sin(f)), (-math.sin(f), math.cos(f)), 0.3, 0.04, 18.9, 20.0)
    kriz(G, M['zlato'], c, 21.5, 0.8)


def postav():
    """Vracia (Geo, výška modelu)."""
    G = Geo()
    M = {
        'omietka': material('omietka-dom', OMIETKA, drsnost=0.85),
        'omietka_veza': material('omietka-veze-dom', OMIETKA_VEZA, drsnost=0.85),
        'biela': material('omietka-kaplnky-dom', BIELA, drsnost=0.85),
        'plech_strecha': material('plech-predsiene-dom', PLECH, drsnost=0.55, kov=0.3),
        'zelezo': material('zelezo-dom', '#26292a', drsnost=0.55, kov=0.5),
        'kamen': material('piesokovec-dom', KAMEN, drsnost=0.8),
        'kamen_tmavy': material('kamen-presbyterium-dom', KAMEN_TMAVY, drsnost=0.85),
        'sokel': material('sokel-dom', SOKEL, drsnost=0.9),
        'strecha': material('skridla-dom', STRECHA, drsnost=0.75),
        'strecha_presb': material('skridla-presbyterium-dom', STRECHA_PRESB, drsnost=0.75),
        'med': material('med-patina-dom', MED, drsnost=0.5, kov=0.25),
        'zlato': material('zlato-dom', ZLATO, drsnost=0.35, kov=0.6),
        'sklo': material('vitraz-dom', SKLO, drsnost=0.15, kov=0.4),
        'dvere': material('dvere-dom', DVERE, drsnost=0.6),
        'cifernik': material('cifernik-dom', CIFERNIK, drsnost=0.5),
        'cierna': material('ciferník-cisla-dom', CIERNA, drsnost=0.5),
        'plech': material('plech-sanktusnik-dom', '#3c4245', drsnost=0.5, kov=0.3),
        'tma': material('lucerna-vnutro-dom', '#1b1e21', drsnost=0.9),
    }
    postav_lod(G, M)
    postav_presbyterium(G, M)
    postav_vezu(G, M)
    postav_predsien(G, M)
    postav_kaplnky(G, M)
    return G, Z_KORUNA


# bod na dlažbe pred južnou predsieňou (lokálne x, z hry) – model sa kladie naň
_zb = B(-4.4, -20.6)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]
