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

A BLE tényleges teszteléséhez fizikai Android eszköz kell, emulátor nem elég.

## Fontos

Az első verzióban a BLE/LWP3 réteg MVP-szintű: a UI és az architektúra kész, a konkrét vonattal való finomhangolást valós eszközön kell validálni. A debug mód mock állapottal is használható.
