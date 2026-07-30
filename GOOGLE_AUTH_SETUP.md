# Google prijava — podešavanje za produkciju

Kod za prijavu je spreman, ali se ne sme pustiti bez stvarnog OAuth podešavanja.

1. U Google Cloud projektu podesi Google Auth Platform i napravi **Web OAuth client**. Njegov Client ID (završava se na `.apps.googleusercontent.com`) koristi se za izdavanje ID tokena za server.
2. U istom projektu registruj Android aplikaciju `com.zemljopis.app` sa SHA-1/SHA-256 sertifikata kojim se potpisuje Play izdanje. Ako koristiš Play App Signing, unesi sertifikat za potpisivanje aplikacije iz Play Console-a.
3. Na Render serveru postavi promenljivu `GOOGLE_CLIENT_ID` na Web Client ID iz prvog koraka. Ne postavljaj `GOOGLE_AUTH_DEV_MODE=true` u produkciji.
4. Za Android build postavi istu vrednost kao `GOOGLE_WEB_CLIENT_ID`. Možeš je dati samo procesu izgradnje:

   ```powershell
   $env:GOOGLE_WEB_CLIENT_ID = "tvoj-web-client-id.apps.googleusercontent.com"
   .\gradlew.bat assembleRelease
   ```

   ili u privatni `android/gradle.properties` koji se ne deli:

   ```properties
   GOOGLE_WEB_CLIENT_ID=tvoj-web-client-id.apps.googleusercontent.com
   ```

5. Izgradi i instaliraj novo izdanje. Prijava šalje samo kratkotrajni Google ID token serveru; server proverava potpis, publiku, rok važenja i jednokratni nonce.

Android aplikacija ne koristi niti čuva OAuth Client Secret. Client ID nije tajna; Client Secret nikada ne dodavati u ovaj repozitorijum ili APK.
