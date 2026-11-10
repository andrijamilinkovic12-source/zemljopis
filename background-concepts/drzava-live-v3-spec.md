# Država — 3D Soft Clay Mat live pozadina, nova osnova

Statična osnova: `www/assets/theme-live-v3/drzava-base.png` (941 × 1672).

Osnova sadrži kartu, reljef, okean, nebo i statično kućište kompasa sa engleskim oznakama `N/E/S/W`. Slova su zakrenuta u ravan nagnutog brojčanika i stoje unutar njegovog oboda. Oznake i crtice su zaseban statični `www/assets/theme-live-v3/compass-dial.png`, a `compass-background.png` je izvod kućišta sa brojčanikom bez igle. Na osnovi nema aviona, pinova, oblaka, linija između pinova ni pokretne igle. Čista osnova pre ucrtavanja oznaka sačuvana je kao `background-concepts/drzava-live-v3-base-blank-compass.png`.

Pokretni detalji su izrađeni kao odvojeni providni PNG fajlovi u `background-concepts/drzava-live-v3-sprites/`:

- Avion: osam providnih PNG pogleda istog aviona, u osnovnim i dijagonalnim smerovima. Ista eliptična putanja sada traje dvanaest sekundi.
- Pinovi: `pin-coral.png`, `pin-gold.png`, `pin-africa.png` i `pin-rose.png` na Severnoj Americi, Evropi, južnijem središnjem delu Afrike prema Madagaskaru i Južnoj Americi. Svi su prikazani u izvornom odnosu širine i visine.
- Linija: posle udara jednog pina putuje ka sledećem. Kada stigne, taj pin se podiže i udara u mapu; tek njegov udar šalje novu liniju. Krug ide Severna Amerika → Evropa → Afrika → Južna Amerika → Severna Amerika. Linija je deo zasebnih raster kadrova i nije trajno nacrtana na osnovi.
- Oblaci: `cloud-left.png`, `cloud-middle.png` i `cloud-right.png` blago klize u gornjem delu slike.
- Kompas: `compass-needle.png` leži iznad statičnog brojčanika sa oznakama i blago menja pravac. Osnovni ugao igle je poravnat sa nagnutim ovalom kompasa.

Osam uglova aviona, tri prvobitna pina i tri oblaka potiču iz transparentnih imagegen PNG listova `plane-sheet.png`, `plane-diagonals-sheet.png`, `pins-sheet.png` i `clouds-sheet.png`. Listovi su razdvojeni skriptom `scripts/split-drzava-v3-sprites.ps1`; `pin-africa.png` i `compass-needle.png` su zasebno generisani PNG fajlovi.

Prompts: jedan isti krem i koralni avion iz osam uglova; četiri zaobljena glinena pina u koralnoj, zlatnoj, tirkiznoj i ružičastoj boji; tri različita mekana krem/lavanda oblaka; zlatno-lavanda četvorokraka igla kompasa. Svi imaju pravu providnu pozadinu, mat glineni materijal i osvetljenje sa gornje leve strane, bez teksta ili drugih elemenata. Afrički tirkizni pin i četiri dodatna dijagonalna ugla aviona napravljeni su prema referenci postojećih spriteova.

`scripts/build-drzava-live-v3-frames.ps1` pravi 96 transparentnih PNG kadrova. `scripts/build-theme-live-apng.py` ih pakuje sa statičnom osnovom u `www/assets/theme-live-v3/drzava-live.png` (APNG, 97 kadrova, dvanaest sekundi po ciklusu). U aplikaciji se za Državu koristi statična osnova i ovaj live PNG, bez SVG/CSS animacije pozadine.

```powershell
./scripts/split-drzava-v3-sprites.ps1
./scripts/build-drzava-v3-compass-dial.ps1
./scripts/build-drzava-live-v3-frames.ps1 -FrameCount 96
python scripts/build-theme-live-apng.py --frame-root tmp/drzava-v3-frames --asset-root www/assets/theme-live-v3 --themes drzava --frames 96 --duration-ms 125 --base-duration-ms 1
```
