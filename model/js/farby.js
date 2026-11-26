// Jednoduché farby modelu (bez textúr). Mapa plôch (tools/model/plochy.py) používa tie isté farby – PLOCHY.
// od = od ktorého variantu sa ukazuje v legende.

export const FARBY = {
  teren: '#d8d2c4',
  budova: '#b9bbbe',
  strecha: '#9fa3a8',
  most: '#a7a39b',
  zabradlie: '#6f777a',
  voda: '#6f9fc4',
  koruna: '#5f8f4a',
  kmen: '#6b5240',
};

export const LEGENDA = [
  { nazov: 'terén (laser 0,5 m)', farba: FARBY.teren, od: 1 },
  { nazov: 'budovy', farba: FARBY.budova, od: 2 },
  { nazov: 'vozovka', farba: '#55575a', od: 3 },
  { nazov: 'chodník, pešia zóna', farba: '#a9a6a0', od: 3 },
  { nazov: 'cyklotrasa', farba: '#b0766a', od: 3 },
  { nazov: 'parkovisko, spevnená plocha', farba: '#8d8b87', od: 3 },
  { nazov: 'koľajisko', farba: '#7a6a5c', od: 3 },
  { nazov: 'tráva, park', farba: '#9fc07a', od: 3 },
  { nazov: 'les, kroviny', farba: '#6f9a58', od: 3 },
  { nazov: 'ihrisko, šport', farba: '#c9a77a', od: 3 },
  { nazov: 'voda', farba: FARBY.voda, od: 3 },
  { nazov: 'mosty a nadjazdy', farba: FARBY.most, od: 4 },
  { nazov: 'stromy', farba: FARBY.koruna, od: 4 },
];
