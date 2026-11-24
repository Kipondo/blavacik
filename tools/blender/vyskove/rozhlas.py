# Slovenský rozhlas – „Pyramída“ (Mýtna 1; Štefan Svetko, Štefan Ďurkovič, Barnabáš Kisling; 1967–1983; NKP od 2018).
# Prieskum (#125, napady/pamiatky-podklady.md – Pyramída): obrátený štvorboký ihlan so stredom x 464,3, z −1168,1
# (OSM vrstvy po podlažiach), strany na azimutoch 33,5° a 123,5°.
#   – 6 kancelárskych podlaží (výška dosiek 16,0 + 3,45·k m), každé o ~3,1 m na stranu širšie (strana 37,3 → 74,6 m);
#     okraje dosiek a mriežka ležia v jednej šikmej rovine (~47°) – zvonku súvislá šikmá stena, nie schody,
#   – po každej stene hnedá oceľová mriežka z kosoštvorcov (12 polí po 6,2 m na hornej hrane, kosoštvorec = 1 pole
#     × 2 podlažia), dvojité nárožné prúty; za ňou hnedé čelo dosky, tmavý pás okien a svetlý podhľad dosky nad ním,
#   – ihlan stojí na 8 hnedých krížových stĺpoch (štvorec 31 m) s rozvetvenými hlavicami (~12,6 m), vnútri tehlový
#     blok (27 m) okolo betónového jadra (13,2 m, až po vežu),
#   – na streche: presklená atika (54 m, do 45 m), tmavohnedá rebrovaná atika (40 m, do 49,5 m), veža (13,5 m, do 67,5 m)
#     so vzperami a mriežkový stožiar do 82,6 m,
#   – nápis „SLOVENSKÝ ROZHLAS“ (verejná inštitúcia, ako UNIVERZITA KOMENSKÉHO) na hornej hrane SZ a JV steny:
#     ~36 m, písmená 2 m, červenooranžové,
#   – podnož: červenohnedá klinkerová tehla a biely pohľadový betón (OSM časti 4,2 – 16,8 m), koncertné štúdio 16,8 m,
#     vstup v južnom rohu s bielou betónovou strieškou na stĺpoch.
# Farba ocele po nátere 2022: #4a332e. Obrysy podnože z OSM (tools/blender/data/obrysy.json, kľúč „rozhlas“).

import math

from veze import Geo, z_hry, stred_obrysu, sklo, odsad
from spolocne import material
from vyskove.stavebna_fakulta import napis_rovny

STRED_HRA = (464.3, -1168.1)        # stred ihlanu (OSM vrstvy)
VRSTVA_HORE = '277448084'           # OSM časť hornej vrstvy (štvorec 74,6 m) – natočenie
H = [16.0 + 3.45 * k for k in range(7)]      # výšky dosiek (k = 0 … 6 = horná hrana)
W = [37.3 + 6.22 * k for k in range(7)]      # strany štvorcov dosiek
Z_HLAVICE, W_STLPY = 12.55, 31.08            # hlavice stĺpov a strana štvorca stĺpov (= mriežka o podlažie nižšie)
Z_OKRAJ = 38.6                               # vrch čela hornej hrany
ATIKA1, ATIKA2, VEZA = (54.0, 45.0), (40.0, 49.5), (13.5, 67.5)
STOZIAR = 82.6
# vstupná strieška v južnom rohu (OSM way 616786276, metre hry) a hlavné dvere (uzol 3730845224)
STRIESKA = [(472.3, -1107.3), (477.8, -1103.9), (488.3, -1119.0), (485.6, -1120.8), (482.7, -1122.7)]
VCHOD = (485.6, -1120.8)


def postav(obrysy):
    data = obrysy['rozhlas']
    hlavny = data['hlavne'][0]
    stred = stred_obrysu(hlavny['body'])
    lok = lambda b: z_hry(b, stred)
    bod = lambda p: (p[0] - stred[0], -(p[1] - stred[1]))

    ocel = material('rozhlas-ocel', '#4a332e', drsnost=0.55, kov=0.35)
    cielo = material('rozhlas-celo', '#5a3c33', drsnost=0.6, kov=0.2)
    okna = sklo('rozhlas-okna', '#2b3236', drsnost=0.06, kov=0.8)
    podhlad = material('rozhlas-podhlad', '#c9c8c2', drsnost=0.8)
    tehla = material('rozhlas-tehla', '#7a4a40', drsnost=0.9)
    tehla_t = material('rozhlas-tehla-tmava', '#6a4a3e', drsnost=0.9)
    beton = material('rozhlas-beton', '#d8d8d4', drsnost=0.85)
    jadro_m = material('rozhlas-jadro', '#9d9a93', drsnost=0.85)
    strecha = material('rozhlas-strecha', '#8d8b86', drsnost=0.95)
    atika_sk = sklo('rozhlas-atika', '#3b4448', drsnost=0.05, kov=0.8)
    pismo = material('rozhlas-pismo', '#d8452f', drsnost=0.4)
    sedy = material('rozhlas-ram', '#8f9294', drsnost=0.5, kov=0.5)

    G = Geo()
    # osi ihlanu z hornej vrstvy OSM (štvorec) – a, b jednotkové, c stred
    horna = next(c for c in data['casti'] if c['id'] == VRSTVA_HORE)
    q = lok(horna['body'])
    c = bod(STRED_HRA)
    a = (q[1][0] - q[0][0], q[1][1] - q[0][1])
    la = math.hypot(*a)
    a = (a[0] / la, a[1] / la)
    b = (-a[1], a[0])
    P = lambda u, v: (c[0] + a[0] * u + b[0] * v, c[1] + a[1] * u + b[1] * v)

    def stvorec(s):
        r = s / 2
        return [P(-r, -r), P(r, -r), P(r, r), P(-r, r)]

    def prstenec(mat, s, z0, z1, dnu=False):
        o = stvorec(s)
        for i in range(4):
            p, q2 = o[i], o[(i + 1) % 4]
            G.stena(mat, q2, p, z0, z1) if dnu else G.stena(mat, p, q2, z0, z1)

    def plocha_stvorca(mat, s, z, hore=True):
        G.vodorovna(mat, stvorec(s), z, hore=hore)

    def prstenec_vodorovny(mat, s_dnu, s_von, z, hore):
        I, O = stvorec(s_dnu), stvorec(s_von)
        for i in range(4):
            j = (i + 1) % 4
            body = [(*O[i], z), (*O[j], z), (*I[j], z), (*I[i], z)]
            G.plocha(mat, body if hore else list(reversed(body)))

    # --- podnož z OSM: hlavný obrys 4,2 m (tehla s bielym betónovým pásom), tehlové krídla podľa výšky v OSM ---
    zakl = lok(hlavny['body'])
    G.hranol(tehla, zakl, -1.0, 4.2, mat_vrch=strecha)
    G.pas(beton, zakl, 3.6, 4.35, von=0.08, dnu=0.0)
    for cast in data['casti']:
        t = cast['t']
        if (t.get('building:material') or t.get('roof:material')) != 'tiles' and t.get('building:colour') != 'sienna':
            continue
        try:
            h = float(t.get('height') or 0)
        except ValueError:
            h = 0
        if h <= 4.3:
            continue
        o = lok(cast['body'])
        G.hranol(tehla, o, 4.2, h, mat_vrch=strecha)
        G.pas(beton, o, h - 0.6, h + 0.15, von=0.08, dnu=0.0)

    # --- vstup v južnom rohu: biela betónová strieška na stĺpoch, presklené prízemie ---
    s = [bod(p) for p in STRIESKA]
    G.hranol(beton, s, 2.9, 4.3, vrch=True, spodok=True)
    for k in range(5):
        t = k / 4
        p = (s[1][0] + (s[2][0] - s[1][0]) * t, s[1][1] + (s[2][1] - s[1][1]) * t)
        G.kvader(beton, p, (s[2][0] - s[1][0], s[2][1] - s[1][1]), 0.45, 0.45, 0.0, 2.9)
    G.stena(okna, s[0], s[4], 0.0, 2.9)

    # --- pod ihlanom: tehlový blok, betónové jadro, 8 krížových stĺpov s rozvetvenými hlavicami ---
    G.hranol(tehla_t, stvorec(27.0), 4.2, Z_HLAVICE, mat_vrch=strecha)
    G.hranol(jadro_m, stvorec(13.2), Z_HLAVICE, H[0], vrch=False)
    r = W_STLPY / 2
    for (u, v) in [(-r, -r), (r, -r), (r, r), (-r, r), (0, -r), (r, 0), (0, r), (-r, 0)]:
        p = P(u, v)
        G.kvader(ocel, p, a, 0.95, 0.3, 4.2, Z_HLAVICE)
        G.kvader(ocel, p, b, 0.95, 0.3, 4.2, Z_HLAVICE)
        # hlavica: tri vzpery k spodnej doske (von a do strán)
        dl = math.hypot(u, v) or 1
        nu, nv = u / dl, v / dl
        for (du, dv) in [(nu * 3.2, nv * 3.2), (nu * 2.0 - nv * 3.0, nv * 2.0 + nu * 3.0), (nu * 2.0 + nv * 3.0, nv * 2.0 - nu * 3.0)]:
            G.tram(ocel, (*p, Z_HLAVICE), (*P(u + du, v + dv), H[0]), 0.4)

    # --- ihlan: podlažia (čelo dosky, ustúpený pás okien, podhľad dosky nad ním) ---
    plocha_stvorca(podhlad, W[0], H[0], hore=False)
    for k in range(6):
        prstenec(cielo, W[k], H[k], H[k] + 1.1)
        prstenec(okna, W[k] - 1.0, H[k] + 1.1, H[k + 1])
        prstenec_vodorovny(cielo, W[k] - 1.0, W[k], H[k] + 1.1, True)
        prstenec_vodorovny(podhlad, W[k] - 1.0, W[k + 1], H[k + 1], False)
    prstenec(cielo, W[6], H[6], Z_OKRAJ)
    prstenec(cielo, W[6] - 0.6, H[6], Z_OKRAJ, dnu=True)
    prstenec_vodorovny(cielo, W[6] - 0.6, W[6], Z_OKRAJ, True)
    plocha_stvorca(strecha, W[6] - 0.6, H[6] + 0.2)

    # --- oceľová mriežka v šikmej rovine 0,6 m pred okrajmi dosiek: kosoštvorce 1 pole × 2 podlažia ---
    urovne = [(Z_HLAVICE, W_STLPY)] + list(zip(H, W))
    POLI = 12
    for strana in range(4):
        # strana: u = smer pozdĺž steny (−1 … 1 · polovica šírky), n = von
        rot = [(a, b), (b, (-a[0], -a[1])), ((-a[0], -a[1]), (-b[0], -b[1])), ((-b[0], -b[1]), a)][strana]
        smer, von = rot

        def bod_mriezky(k, f):
            z, w = urovne[k]
            pol = w / 2 + 0.6
            return (c[0] + von[0] * pol + smer[0] * f * pol, c[1] + von[1] * pol + smer[1] * f * pol, z)

        for k in range(len(urovne) - 1):
            pos0 = [(-1 + 2 * j / POLI) + (1 / POLI if k % 2 else 0) for j in range(POLI + 1)]
            for f in pos0:
                for d in (-1, 1):
                    f2 = f + d / POLI
                    if -1.0001 <= f <= 1.0001 and -1.0001 <= f2 <= 1.0001:
                        G.tram(ocel, bod_mriezky(k, f), bod_mriezky(k + 1, f2), 0.38)
        # dvojité nárožné prúty a vodorovné väzby na úrovniach dosiek
        for f in (-1.0, 1.0):
            for k in range(len(urovne) - 1):
                G.tram(ocel, bod_mriezky(k, f), bod_mriezky(k + 1, f), 0.55)
        for k in range(len(urovne)):
            G.tram(ocel, bod_mriezky(k, -1.0), bod_mriezky(k, 1.0), 0.25)

    # --- strecha: presklená atika, rebrovaná atika, veža, vzpery, stožiar ---
    G.hranol(atika_sk, stvorec(ATIKA1[0]), H[6] + 0.2, ATIKA1[1], mat_vrch=strecha)
    o = stvorec(ATIKA1[0])
    for i in range(4):
        p0, p1 = o[i], o[(i + 1) % 4]
        for k in range(19):
            t = k / 18
            G.kvader(ocel, (p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t), a, 0.22, 0.22, H[6] + 0.2, ATIKA1[1])
    G.pas(ocel, o, ATIKA1[1] - 0.8, ATIKA1[1], von=0.1, dnu=0.0)
    G.hranol(cielo, stvorec(ATIKA2[0]), ATIKA1[1], ATIKA2[1], mat_vrch=strecha)
    o = stvorec(ATIKA2[0])
    for i in range(4):
        p0, p1 = o[i], o[(i + 1) % 4]
        nx, ny = (p1[1] - p0[1]) / ATIKA2[0], -(p1[0] - p0[0]) / ATIKA2[0]
        for k in range(1, 40):
            t = k / 40
            G.kvader(ocel, (p0[0] + (p1[0] - p0[0]) * t + nx * 0.08, p0[1] + (p1[1] - p0[1]) * t + ny * 0.08), a, 0.12, 0.12,
                     ATIKA1[1], ATIKA2[1])
    G.hranol(cielo, stvorec(VEZA[0]), ATIKA2[1], VEZA[1], mat_vrch=strecha)
    hr = VEZA[0] / 2
    for (nu, nv) in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
        tu, tv = -nv, nu                                   # dotyčnica steny veže
        T = (a[0] * tu + b[0] * tv, a[1] * tu + b[1] * tv)
        for k in (-0.6, 0.0, 0.6):
            p_veza = P(nu * hr + tu * k * hr, nv * hr + tv * k * hr)
            p_dole = P(nu * (hr + 4) + tu * k * hr, nv * (hr + 4) + tv * k * hr)
            G.tram(ocel, (*p_dole, ATIKA2[1]), (*p_veza, 55.0), 0.45)
            # okienka vysoko na veži
            G.kvader(okna, P(nu * (hr + 0.05) + tu * k * hr, nv * (hr + 0.05) + tv * k * hr), T, 1.4, 0.1, 63.0, 64.5)
    # stožiar: štvorcová mriežka 1,5 m
    hr = 0.75
    rohy = [P(-hr, -hr), P(hr, -hr), P(hr, hr), P(-hr, hr)]
    for p in rohy:
        G.tram(ocel, (*p, VEZA[1]), (*p, STOZIAR), 0.12)
    z = VEZA[1]
    while z < STOZIAR - 0.5:
        z2 = min(STOZIAR, z + 2.0)
        for i in range(4):
            p, q2 = rohy[i], rohy[(i + 1) % 4]
            G.tram(ocel, (*p, z2), (*q2, z2), 0.06)
            G.tram(ocel, (*p, z), (*q2, z2), 0.05)
        z = z2

    # --- nápis „SLOVENSKÝ ROZHLAS“ na hornej hrane SZ a JV steny ---
    # JV stena hľadí v hre na (0,8339; 0,5519) → v Blenderi (0,8339; −0,5519); SZ je opačná
    jv = (0.8339, -0.5519)
    for n_von in (jv, (-jv[0], -jv[1])):
        stred_hrany = (c[0] + n_von[0] * (W[6] / 2 + 0.15), c[1] + n_von[1] * (W[6] / 2 + 0.15))
        smer = (-n_von[1], n_von[0])
        dlzka_r = 38.0
        A = (stred_hrany[0] - smer[0] * dlzka_r / 2, stred_hrany[1] - smer[1] * dlzka_r / 2)
        B = (stred_hrany[0] + smer[0] * dlzka_r / 2, stred_hrany[1] + smer[1] * dlzka_r / 2)
        G.pas(sedy, [A, B], Z_OKRAJ, Z_OKRAJ + 0.15, von=0.05, dnu=0.05, uzavreta=False)
        napis_rovny(G, pismo, 'SLOVENSKÝ ROZHLAS', stred_hrany, smer, n_von, Z_OKRAJ + 0.15, 2.0, hlbka=0.25)

    vchody = [{'id': 'n3730845224', 'bod': [round(VCHOD[0] - stred[0], 2), round(VCHOD[1] - stred[1], 2)], 'vyska': 0.0,
               'nazov': 'hlavný vstup'}]
    # obrysy: podnož (kolízie, náhrada budov) a ihlan; výšky pre dočasný jednoduchý tvar pri načítaní
    return G, [zakl, stvorec(W[6])], STOZIAR, 'rozhlas', {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vchody': vchody,
                                                         'vysky': [4.2, Z_OKRAJ]}
