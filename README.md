# lego-train

Ionic + Angular + Capacitor alapú DUPLO Bluetooth vonatvezérlő.

Ez a repo egy első, futtatható MVP-t tartalmaz:

- mobilra optimalizált, 8 éves gyereknek is használható UI
- sebességvezérlés: hátra / stop / előre / -100..+100 csúszka
- gyári hangok: duda, indulás, fék, víz, gőz
- lámpaszín választás
- egyszerű státusznézet: kapcsolat, akku, érzékelt szín, mért sebesség, utolsó esemény
- BLE adapter réteg Capacitorhoz
- LEGO Wireless Protocol v3 parancsépítő réteg
- Android/iOS natív shell + webes asset live update alap
- Android APK pipeline csak natív shell változásra / kézi indítással

## Indítás

```bash
npm install
npm start
```

## Android build első körben

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## iOS build első körben

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

A BLE tényleges teszteléséhez fizikai Android/iOS eszköz kell, emulátor/szimulátor nem elég.

## APK pipeline

Az Android APK-t a pipeline is elő tudja állítani:

```text
GitHub → Actions → android-apk → Run workflow
```

A workflow automatikusan csak natív szempontból fontos fájlok változásánál indul, például `capacitor.config.ts`, `package.json`, `android/**` vagy maga az APK workflow módosításakor.

A workflow mindig készít debug APK artifactot. Ha stabil release aláírást is szeretnél, GitHub Secrets-ben ezek kellenek:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Részletek: `docs/android-apk-pipeline.md`.

## Frissítési modell

A cél architektúra:

```text
Capacitor natív shell egyszer telepítve
+ Ionic / Angular UI
+ BLE natív plugin Android/iOS-re
+ web asset live update újratelepítés nélkül
```

A natív shell tartalmazza a Bluetooth plugint és a szükséges platformkódot. A webes UI build külön frissíthető.

A live update manifest helye:

```text
https://ivanszkypeter.github.io/lego-train/live-update/manifest.json
```

A GitHub Actions `live-update` workflow minden main push után:

1. production Angular buildet készít,
2. becsomagolja a `www` mappát,
3. publikálja a csomagot és a manifestet GitHub Pagesre.

Első beállításként a GitHub repóban engedélyezni kell a Pages deployt GitHub Actions source-szal.

## Fontos

Az első verzióban a BLE/LWP3 réteg MVP-szintű: a UI és az architektúra kész, a konkrét vonattal való finomhangolást valós eszközön kell validálni. A debug mód mock állapottal is használható.

Live update-tel csak webes assetet szabad frissíteni. Ha natív plugin, iOS/Android permission, app ID, Capacitor verzió vagy natív konfiguráció változik, akkor új natív app build kell.
