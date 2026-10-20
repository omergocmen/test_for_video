# Tarayıcı Oyunları

Kurulum gerektirmeyen, tarayıcıda çalışan küçük oyunlar koleksiyonu.

## Yapı

- `index.html` — ana sayfa, tüm oyunları kart olarak listeler.
- `games/<slug>/index.html` — her oyun kendi klasöründe, kendi JS/CSS dosyalarıyla.

Yalnızca statik HTML/CSS/vanilla JS kullanılır: build adımı, harici CDN, sunucu veya giriş yoktur.
Skorlar tarayıcının `localStorage`'ında tutulur. Oyunlar hem klavye hem dokunmatik ile oynanabilir.

## Yerelde çalıştırma

```sh
python3 -m http.server 8000
# http://localhost:8000 adresini aç
```
