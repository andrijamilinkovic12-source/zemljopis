# Država — 3D Soft Clay Mat live pozadina, nova osnova

Statična osnova: `www/assets/theme-live-v3/drzava-base.png` (941 × 1672).

Osnova sadrži samo kartu, reljef, okean, nebo i kućište kompasa sa praznim brojčanikom. Na njoj nema aviona, pinova, oblaka, linija između pinova ni igle kompasa. Tako svaki pokretni detalj može biti zaseban providni PNG na potpuno istom kadru.

Pokretni detalji su izrađeni kao odvojeni providni PNG fajlovi u `background-concepts/drzava-live-v3-sprites/`:

- Avion: posebni providni PNG prikazi iz više uglova za promenu pravca leta; isti 3D Soft Clay Mat materijal i svetlo.
- Pinovi: `pin-coral.png`, `pin-gold.png` i `pin-rose.png` na Severnoj Americi, Evropi i Južnoj Americi. Svaki se jednom tokom ciklusa podigne i ponovo dotakne površinu karte.
- Linija: pojavljuje se tek kada pin dotakne tlo i putuje ka sledećem pinu; zasebni raster kadrovi, bez trajne linije na osnovi.
- Oblaci: `cloud-left.png`, `cloud-middle.png` i `cloud-right.png` blago klize u gornjem delu slike.
- Kompas: `compass-needle.png` leži iznad praznog brojčanika i blago menja pravac.

Avion koristi `plane-front.png`, `plane-right.png`, `plane-away.png` i `plane-left.png`, sa različitim pogledima istog modela. Linija je iscrtana u PNG kadrovima nakon udara pina; ostaje vidljiva do kraja ciklusa, pa izbledi. Četiri ugla aviona, tri pina i tri oblaka potiču iz novih transparentnih imagegen PNG listova `plane-sheet.png`, `pins-sheet.png` i `clouds-sheet.png`. Listovi su razdvojeni skriptom `scripts/split-drzava-v3-sprites.ps1`; `compass-needle.png` je zaseban generisani PNG.

Prompts: jedan isti krem i koralni avion iz četiri smera; tri zaobljena glinena pina u koralnoj, zlatnoj i ružičastoj boji; tri različita mekana krem/lavanda oblaka; zlatno-lavanda četvorokraka igla kompasa. Svi imaju pravu providnu pozadinu, mat glineni materijal i osvetljenje sa gornje leve strane, bez teksta ili drugih elemenata.

`scripts/build-drzava-live-v3-frames.ps1` pravi 72 transparentna PNG kadra. `scripts/build-theme-live-apng.py` ih pakuje sa statičnom osnovom u `www/assets/theme-live-v3/drzava-live.png` (APNG, 73 kadra, devet sekundi po ciklusu). U aplikaciji se za Državu koristi statična osnova i ovaj live PNG, bez SVG/CSS animacije pozadine.

```powershell
./scripts/split-drzava-v3-sprites.ps1
./scripts/build-drzava-live-v3-frames.ps1 -FrameCount 72
python scripts/build-theme-live-apng.py --frame-root tmp/drzava-v3-frames --asset-root www/assets/theme-live-v3 --themes drzava --frames 72 --duration-ms 125 --base-duration-ms 1
```
