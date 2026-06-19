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
