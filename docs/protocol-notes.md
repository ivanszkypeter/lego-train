# LEGO DUPLO Train BLE / LWP3 jegyzetek

## BLE kapcsolat

A DUPLO vonat a LEGO Wireless Protocol v3 / Powered Up BLE UUID-jeit használja:

- Service UUID: `00001623-1212-efde-1623-785feabcd123`
- Characteristic UUID: `00001624-1212-efde-1623-785feabcd123`

Az app a `@capacitor-community/bluetooth-le` plugint használja:

1. `BleClient.initialize()`
2. `BleClient.requestDevice(...)`
3. `BleClient.connect(...)`
4. `BleClient.startNotifications(...)`
5. `BleClient.write(...)`

## Amit az MVP már modellez

- motor sebesség: `-100..+100`
- STOP
- hangok: duda, indulás, fék, víz, gőz
- lámpaszínek
- akku, RSSI, színszenzor és sebességszenzor callback helye
- gyerek mód: sebességkorlát `±45%`
- brick követés / állomás mód kapcsolók

## Első valós eszközös validáció

A `src/app/core/train/lwp3.ts` fájlban a port- és sound-mapping direkt egy helyen van.

Ezeket érdemes elsőként ellenőrizni:

```ts
export const DUPLO_PORTS = {
  motor: 0x00,
  speaker: 0x01,
  light: 0x11,
  colorSensor: 0x12,
  speedSensor: 0x13
};
```

Ha a vonat nem reagál egy funkcióra, nem a UI-t kell módosítani, hanem ezt a mappinget és/vagy a parancsépítőt.

## Következő fejlesztési lépések

1. Debug log oldal: minden bejövő LWP3 packet hex dumpja.
2. Attached I/O parser: portok automatikus felismerése.
3. Sound ID finomhangolás fizikai vonaton.
4. Több gyerekprofil és eltérő sebességkorlát.
5. Record/replay útvonal: események időbélyeggel mentve.
