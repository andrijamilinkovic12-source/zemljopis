# Podešavanje bezbednog globalnog četa

Globalni čet prihvata poruke samo od prijavljenog profila koji je prihvatio pravila. Svaka poruka nosi serverski `playerId` i trenutni nadimak iz baze; klijent ne može da ih zada.

## Podešavanja okruženja

Dodaj ove vrednosti na produkcionom serveru, bez upisivanja tajni u repozitorijum:

```env
# Dodatni web origin-i koji smeju da koriste Socket.IO, odvojeni zarezom.
SOCKET_CORS_ORIGINS=https://tvoj-domen.rs

# Player ID-jevi moderatora, odvojeni zarezom. Prazna vrednost znači da nema moderatora.
CHAT_MODERATOR_PLAYER_IDS=player-id-prvog-moderatora,player-id-drugog-moderatora

# Dodatni izrazi koje server maskira sa ***, odvojeni zarezom.
CHAT_BLOKIRANI_IZRAZI=izraz1,izraz2

# Samo za interno testiranje: traži prihvatanje pri svakom novom otvaranju četa.
# Ne postavljati na produkcionom serveru.
CHAT_TEST_UVEK_TRAZI_PRAVILA=true
```

Podrazumevano su dozvoljeni lokalni razvoj, `https://zemljopis.onrender.com` i Capacitor/Ionic origin-i. Za sopstveni domen obavezno navedi `SOCKET_CORS_ORIGINS`.

## Moderacija

- Igrač može prijaviti poruku samo jednom; prijava se čuva na serveru.
- Tri prijave različitih igrača u roku od 24 sata automatski utišavaju autora na 24 sata.
- Svaki igrač može lokalno utišati drugi `playerId`; promena nadimka ne utiče na utišavanje.
- Moderator dobija kontrole za utišavanje na 24 sata i trajnu blokadu. Njegov `playerId` mora biti naveden u `CHAT_MODERATOR_PLAYER_IDS`.
- Ugrađeni filter maskira česte srpske i engleske vulgarizme, uključujući latinicu, ćirilicu i jednostavno zaobilaženje razmacima, brojevima ili simbolima. Samo se maskirana verzija šalje u čet.
- Linkovi su blokirani uvek, a dodatni izrazi se unose preko `CHAT_BLOKIRANI_IZRAZI` i takođe se maskiraju.
- Za pregled kartice pravila tokom razvoja postavi `CHAT_TEST_UVEK_TRAZI_PRAVILA=true`. Isključi je ili ukloni pre produkcije; trajno prihvatanje iz baze tada ponovo važi.

Pokreni proveru pre objave:

```powershell
npm run test:chat-filter
npm run test:chat
```
