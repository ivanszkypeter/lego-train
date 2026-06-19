# Natív shell + seamless web asset update

## Cél

Az app telepítési modellje:

```text
Capacitor natív shell egyszer telepítve
+ Ionic / Angular UI
+ BLE natív plugin Android/iOS-re
+ web asset update újratelepítés nélkül
```

A család telefonjaira egyszer kerül fel az Android/iOS app. Ezután a legtöbb UI és TypeScript logikai változás webes csomagként érkezhet.

## Mi frissülhet újratelepítés nélkül?

Frissíthető live update-tel:

- képernyők és UI
- Angular komponensek
- CSS / dizájn
- vonatvezérlő TypeScript logika
- LEGO LWP3 mapping finomhangolás, ha nem igényel natív plugin módosítást

Nem frissíthető biztonságosan live update-tel:

- új natív plugin hozzáadása
- Android/iOS permission módosítás
- app ID / bundle ID
- Capacitor verzióváltás
- natív Android/iOS konfiguráció
- App Store / Play Store által natív review-t igénylő változás

## Release flow

1. Fejlesztés main branchre.
2. GitHub Actions lefut.
3. Elkészül a production Angular build.
4. A `www` mappa ZIP csomagba kerül.
5. A ZIP és a manifest GitHub Pagesre kerül.
6. Az app induláskor a live update pluginnal ellenőrzi az elérhető webes csomagot.

## GitHub Pages beállítás

A repóban be kell kapcsolni:

- Settings → Pages
- Source: GitHub Actions

A várt manifest URL:

```text
https://ivanszkypeter.github.io/lego-train/live-update/manifest.json
```

A várt web bundle URL:

```text
https://ivanszkypeter.github.io/lego-train/live-update/lego-train-web.zip
```

## Gyerekbarát frissítési szabály

A vonatvezérlőnél nem akarunk frissítést játék közben. A cél viselkedés:

- app induláskor ellenőriz;
- háttérben letölti az új webes csomagot;
- amikor biztonságos, az új verzió aktiválódik;
- ha a vonat mozog vagy aktív a BLE kapcsolat, nem zavarja meg a játékot.

## Következő technikai finomítás

A mostani MVP beköti a live update plugint és a státuszkezelés alapját. Következő lépésként érdemes külön release csatornákat bevezetni:

- `stable`: családi használat
- `beta`: saját teszttelefon
- `dev`: fejlesztői build
