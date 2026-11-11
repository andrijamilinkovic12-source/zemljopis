# Država — 3D Soft Clay Mat live pozadina, nova osnova

Statična osnova u upotrebi: `www/assets/theme-live-v3/drzava-base-v4.png` (941 × 1672). Ovo je nova, jedinstvena imagegen PNG slika, napravljena prema prethodnom kadru, sa kompasom nacrtanim neposredno u prizoru.

Osnova sadrži kartu, reljef, okean, nebo i statično kućište kompasa sa engleskim oznakama `N/E/S/W`. `N` stoji na gornjem vrhu brojčanika; crtice su odvojene od slova. Kućište i oznake su deo istog rastera, bez dodatnog sloja. Na osnovi nema aviona, pinova, oblaka, linija između pinova ni pokretne igle. Starija osnova i `compass-dial.png` ostaju kao istorija ranije verzije.

Imagegen edit za novu osnovu: ponovo nacrtati istu kompoziciju sveta u 3D Soft Clay Mat stilu; uključiti zlatni kompas u donjem desnom uglu, sa krem brojčanikom i oznakama N na vrhu, E desno, S dole, W levo, u ravni nagnute površine; ostaviti prostor oko slova bez crtica; bez igle, aviona, pinova, ruta i oblaka. Referenca: prethodna statična PNG osnova.

Pokretni detalji su izrađeni kao odvojeni providni PNG fajlovi u `background-concepts/drzava-live-v3-sprites/`:

- Avion: šesnaest zasebnih providnih PNG slika `plane-turn-00.png`–`plane-turn-15.png`, redom na svakih 22,5° oko aviona. `00` je pogled direktno spreda, `04` levi bok, `08` direktno otpozadi, a `12` desni bok. Pogledi sa suprotnih strana su simetrični da se avion prirodno vrati na početak kruga. Skripta bira PNG prema tangenti putanje i samo blago zakreće sliku unutar jednog ugla. Krug traje dvanaest sekundi.
- Pinovi: `pin-coral.png`, `pin-gold.png`, `pin-africa.png` i `pin-rose.png` na Severnoj Americi, Evropi, južnijem središnjem delu Afrike prema Madagaskaru i Južnoj Americi. Svi su prikazani u izvornom odnosu širine i visine.
- Linija: posle udara jednog pina putuje ka sledećem. Kada stigne, taj pin se podiže i udara u mapu; tek njegov udar šalje novu liniju. Krug ide Severna Amerika → Evropa → Afrika → Južna Amerika → Severna Amerika. Linija je deo zasebnih raster kadrova i nije trajno nacrtana na osnovi.
- Oblaci: `cloud-left.png`, `cloud-middle.png` i `cloud-right.png` blago klize u gornjem delu slike.
- Kompas: `compass-needle.png` leži iznad statičnog brojčanika sa oznakama i blago menja pravac. Osnovni ugao igle je poravnat sa nagnutim ovalom kompasa.

Aktivan niz aviona je prikazan na `background-concepts/drzava-plane-16-views.png`. Pogledi `00`, `01`, `02`, `03`, `05`, `07` i `08` posebno su generisani imagegen alatom prema ranijim PNG referencama. `04` potiče iz `plane-left.png`, `06` je odraz `plane-away-left.png`; desna polovina (`09`–`15`) zasebni su PNG fajlovi izvedeni kao ogledalski odrazi odgovarajućih levih pogleda. Raniji `plane-sheet.png`, `plane-diagonals-sheet.png` i osam starih PNG pogleda ostaju kao izvori, ali nisu deo aktivne animacije. Pogledi se biraju po stvarnom smeru leta, a ne po položaju na elipsi. Tri prvobitna pina i tri oblaka potiču iz transparentnih imagegen PNG listova `pins-sheet.png` i `clouds-sheet.png`. Listovi su razdvojeni skriptom `scripts/split-drzava-v3-sprites.ps1`; `pin-africa.png` i `compass-needle.png` su zasebno generisani PNG fajlovi.

Imagegen prompt za avion: isti zaobljeni 3D Soft Clay Mat avion, krem trup, koralni nos i krila, tri tamna ovalna prozora sa zlatnim okvirima, tamna dvostruka stakla kabine, zlatna trokraka elisa, zlatna traka i izdignuta zvezda na repu; tačno jedan pogled pod zadatim uglom između susednih referenci, isti nivo kamere, meko osvetljenje odozgo sleva, ceo avion u kadru, providna pozadina, bez teksta, senke tla i drugih objekata. Posebni promptovi za `00` i `08` traže simetričan direktan pogled spreda i otpozadi. Ostali prompts: četiri zaobljena glinena pina u koralnoj, zlatnoj, tirkiznoj i ružičastoj boji; tri različita mekana krem/lavanda oblaka; zlatno-lavanda četvorokraka igla kompasa. Afrički tirkizni pin napravljen je prema referenci postojećih spriteova.

`scripts/build-drzava-live-v3-frames.ps1` pravi 96 transparentnih PNG kadrova. `scripts/build-theme-live-apng.py` ih pakuje sa statičnom osnovom u `www/assets/theme-live-v3/drzava-live.png` (APNG, 97 kadrova, dvanaest sekundi po ciklusu). U aplikaciji se za Državu koristi statična osnova i ovaj live PNG, bez SVG/CSS animacije pozadine.

```powershell
./scripts/split-drzava-v3-sprites.ps1
./scripts/build-drzava-live-v3-frames.ps1 -FrameCount 96
python scripts/build-theme-live-apng.py --frame-root tmp/drzava-v3-frames --asset-root www/assets/theme-live-v3 --themes drzava --frames 96 --duration-ms 125 --base-duration-ms 1
```
