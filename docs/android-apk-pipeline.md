# Android APK pipeline

## Cél

Az APK-t ne kelljen minden webes/UI változásnál újra előállítani. A normál működés:

```text
UI / TypeScript logika változik
→ live update web bundle
→ nem kell új APK
```

Új APK csak akkor kell, ha a natív shell változik.

## Mikor kell új APK?

Új APK kell például ezeknél:

- új natív plugin hozzáadása
- Android permission módosítás
- `capacitor.config.ts` változás
- Capacitor vagy natív plugin verzióváltás
- app ID / app név / natív konfiguráció változás
- Android platform projekt kézi módosítása

Nem kell új APK ezeknél:

- Angular komponens változás
- CSS / UI design változás
- vonatvezérlő TypeScript logika változás
- LEGO LWP3 mapping finomhangolás
- hang/fény/szenzor UI módosítás

Ezeket a live update workflow kezeli.

## Workflow

Az APK build workflow:

```text
.github/workflows/android-apk.yml
```

Automatikusan csak natív szempontból fontos fájlok változásánál indul:

- `capacitor.config.ts`
- `package.json`
- `package-lock.json`
- `android/**`
- maga az APK workflow fájl

Kézzel bármikor indítható:

```text
GitHub → Actions → android-apk → Run workflow
```

## Debug APK

A workflow mindig készít debug APK-t artifactként:

```text
lego-train-debug-apk
```

Ez gyors tesztelésre jó.

Fontos: debug APK-val hosszú távú családi terítésre nem ideális számolni, mert az aláírás nem release signing flow.

## Stabil release APK

Ahhoz, hogy ugyanarra a telefonra később új APK-ként frissíthető legyen az app, stabil release aláírás kell.

Ehhez GitHub Secrets-be kell felvenni:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Ha ezek a secretök megvannak, a workflow signed release APK-t is készít:

```text
lego-train-release-signed-apk
```

## Keystore előállítás példa

Lokálisan:

```bash
keytool -genkeypair \
  -v \
  -keystore lego-train-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias lego-train

base64 -i lego-train-release.jks | pbcopy
```

A `pbcopy` tartalma mehet az `ANDROID_KEYSTORE_BASE64` GitHub Secretbe.

A jelszavakat külön secretként add meg.

## Telepítés telefonra

A workflow lefutása után:

1. GitHub → Actions
2. Nyisd meg a sikeres `android-apk` run-t
3. Artifacts
4. Töltsd le a `lego-train-release-signed-apk` vagy `lego-train-debug-apk` csomagot
5. Csomagold ki
6. Másold fel Android telefonra
7. Telepítsd az APK-t

A stabil frissíthetőséghez mindig ugyanazzal a release keystore-ral aláírt APK-t telepíts.
