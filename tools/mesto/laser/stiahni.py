# Stiahne laserové dáta ÚGKK SR (LLS 2. cyklus, LOT08 – Bratislava) do .cache/laser/.
#
# Každý ZIP na opendata.skgeodesy.sk obsahuje jeden obrovský GeoTIFF (DMR 6.0 ≈ 11,2 GB, DMP 2.0 ≈ 5,9 GB).
# ZIP sa na disk neukladá: zo servera sa čítajú len potrebné časti (HTTP Range) – zoznam súborov
# z konca ZIPu, potom záznam s TIFFom paralelne po kusoch, ktorý sa priebežne rozbaľuje rovno do .tif.
# Treba ~17 GB voľného miesta, pri ~10–15 MB/s to trvá asi 25 minút.
#
# Spustenie: python3 tools/mesto/laser/stiahni.py [dmr] [dmp]
import sys, os, io, zlib, time, struct, threading, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests
from spolocne import CACHE, SUBORY, URL

KUS = 32 * 1024 * 1024
VLAKNA = 8
OKNO = 16


class SuborCezHttp(io.RawIOBase):
    """Súbor na serveri, z ktorého sa číta po častiach (stačí na zipfile – zoznam súborov)."""

    def __init__(self, url):
        self.url, self.poz = url, 0
        self.velkost = int(requests.head(url, timeout=60).headers['Content-Length'])

    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.poz

    def seek(self, o, odkial=0):
        self.poz = o if odkial == 0 else self.poz + o if odkial == 1 else self.velkost + o
        return self.poz

    def readinto(self, b):
        n = min(len(b), self.velkost - self.poz)
        if n <= 0: return 0
        r = requests.get(self.url, headers={'Range': f'bytes={self.poz}-{self.poz + n - 1}'}, timeout=120)
        b[:len(r.content)] = r.content; self.poz += len(r.content)
        return len(r.content)


def stiahni_zaznam(url, info, vystup):
    """Paralelné stiahnutie jedného záznamu (deflate) a priebežné rozbalenie do súboru."""
    hl = requests.get(url, headers={'Range': f'bytes={info.header_offset}-{info.header_offset + 29}'}, timeout=60).content
    assert hl[:4] == b'PK\x03\x04'
    n, m = struct.unpack('<HH', hl[26:30])
    zac = info.header_offset + 30 + n + m
    kon = zac + info.compress_size
    kusy = [(o, min(o + KUS, kon)) for o in range(zac, kon, KUS)]
    hotove, podm, dalsi, spotr = {}, threading.Condition(), [0], [0]

    def pracovnik():
        s = requests.Session()
        while True:
            with podm:
                while dalsi[0] < len(kusy) and dalsi[0] - spotr[0] >= OKNO: podm.wait()
                if dalsi[0] >= len(kusy): return
                i = dalsi[0]; dalsi[0] += 1
            a, b = kusy[i]; data = bytearray(); pokus = 0
            while len(data) < b - a:
                try:
                    r = s.get(url, headers={'Range': f'bytes={a + len(data)}-{b - 1}'}, stream=True, timeout=60)
                    for c in r.iter_content(1 << 20): data.extend(c)
                except Exception:
                    pokus += 1
                    if pokus > 20: raise
                    time.sleep(2)
            with podm:
                hotove[i] = bytes(data); podm.notify_all()

    for _ in range(VLAKNA): threading.Thread(target=pracovnik, daemon=True).start()
    d = zlib.decompressobj(-15); t0 = time.time()
    with open(vystup + '.cast', 'wb') as f:
        for i in range(len(kusy)):
            with podm:
                while i not in hotove: podm.wait(5)
                data = hotove.pop(i); spotr[0] = i + 1; podm.notify_all()
            f.write(d.decompress(data))
            if i % 20 == 0:
                hot = kusy[i][1] - zac
                print(f'  {hot / 1e9:.2f}/{info.compress_size / 1e9:.2f} GB, {hot / (time.time() - t0) / 1e6:.1f} MB/s', flush=True)
        f.write(d.flush())
    os.replace(vystup + '.cast', vystup)


if __name__ == '__main__':
    os.makedirs(CACHE, exist_ok=True)
    for druh in (sys.argv[1:] or ['dmr', 'dmp']):
        zipmeno, tif, tfw = SUBORY[druh]
        url = URL + zipmeno
        z = zipfile.ZipFile(io.BufferedReader(SuborCezHttp(url), buffer_size=1 << 20))
        for meno in (tfw, tif):
            ciel = os.path.join(CACHE, os.path.basename(meno))
            info = z.getinfo(meno)
            if os.path.exists(ciel) and os.path.getsize(ciel) == info.file_size:
                print(f'{ciel} už existuje'); continue
            print(f'{druh}: {meno} ({info.file_size / 1e9:.1f} GB)', flush=True)
            if info.file_size < 1e6:
                open(ciel, 'wb').write(z.read(meno))
            else:
                stiahni_zaznam(url, info, ciel)
    print('hotovo')
