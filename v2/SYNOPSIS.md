# 2groove2 — Proje Sinopsisi

*Durum: 14 Ekim 2026*

## Proje nedir?

Postdoc araştırma projesi: **insanın tek kanallı tapping'inden (ritmik jest),
algısal olarak uyumlu ve çeşitli full drum groove'lar üretmek.** Bunu sıfırdan
büyük bir eşleşmiş veri seti toplamadan yapıyoruz — mevcut insan verisi
(TapTamDrum, Gómez-Marín et al.), kontrollü sentetik eşleşmeler ve küçük
ölçekli insan değerlendirmelerinin birleşimiyle. RL kapsam dışı.

Çalışma iki paralel hatta ilerliyor:

1. **Uygulama hattı** ([CONTRASTIVE.md](CONTRASTIVE.md)): masked-HVO groove
   encoder pretraining'i (tamamlandı), TapTamDrum köprüsü, insan çiftleriyle
   contrastive tap–groove alignment (frozen-encoder pilot + rhythm-branch
   ablation suite'i remote GPU'da koşulmaya hazır), retrieval ve statik
   çeşitlilik arşivi. Eski CVAE ve prosedürel motor karşılaştırma baseline'ı
   olarak donduruldu.
2. **Ters yön araştırma hattı** — full groove → 1-ch
   ([research/solo_tapping](research/solo_tapping/README.md)): yerel shapelet
   uyumluluk skoru + MAP-Elites ile tek elle çalınabilir 1-ch yorumlar arama.
   Bu hat, nihai 1-ch → groove modeline (adım 5) veri ve uyumluluk bilgisi
   sağlayan ara bileşen.

## 7 adımlı ana plan ve durum

| Adım | Durum |
|---|---|
| 1. İnsan verisini doğrulamak | ✅ İlk aşama bitti — TapTamDrum audit (345 orijinal / 1.116 yorum), Gómez-Marín audit (588 çift, sorunlular karantinada) |
| 2. İnsan yorumunu açıklayan özellik benchmark'ı | ✅ İlk benchmark bitti — metre/onset/FWOD/shapelet karşılaştırması; **shapelet üstünlüğü kurulamadı** |
| 3. İnsan destekli uyumluluk skoru | 🔶 Offline kısmı tamamlandı (2026-10-13) |
| 4. MAP-Elites ile sentetik groove→1-ch eşleşmeler | 🔶 Altyapı hazır ve koşuldu; çıktılar "sentetik aday" statüsünde, skor henüz güvenilir hedef değil |
| 5. Asıl 1-ch → full groove modeli | ⬜ Bekliyor |
| 6. Hedefli insan değerlendirmesi | 🔶 **Araç kuruldu (2026-10-13), yanıt bekleniyor** |
| 7. Kontrollü insan geri bildirim döngüsü | ⬜ Bekliyor |

## Adım 3'te yapılanlar (2026-10-13)

Üç aşamalı bir zincirle skor insan verisine karşı sınandı ve yeniden tasarlandı:

- **Bileşen diagnostiği** (`diagnose` komutu): skorun altı bileşeni ayrı ayrı
  held-out retrieval'da ölçüldü; 51 validation kaynağının tümünde adversarial
  batarya koşuldu. Bulgu: microtiming silmek skoru **51/51** kaynakta
  yükseltiyordu (baskın exploit); hiçbir bileşen basit onset-cosine
  baseline'ına yaklaşmıyor (.240 vs .518 MRR).
- **Skor redesign'ı** (conservation-v2): offset kanalı kaldırılarak microtiming
  exploit'i tamamen kapatıldı (51/51 → 0/51, retrieval maliyetsiz); opsiyonel
  onset terimi eklendi — retrieval'ı büyütüyor (.415'e kadar) ama
  onset-kopyalama degenerasyonunu artırıyor. `expected` (insan-koşullu) terim
  en iyi denge.
- **Search-time kontrol**: v1 skoru arama hedefi olarak geçersiz çıktı
  (MAP-Elites 46/51 kaynakta tüm gerçek insanları geçen sentetik aday
  buluyor); redesign bunu 18/51'e düşürüyor ama exploitation onset-taklidine
  kayıyor. **Hiçbir varyant terfi ettirilmedi** — darboğaz ağırlık değil
  temsil, ve bir sonraki bilgi kazancı dinleme yargısından gelecek.

Kanıtlar [research/solo_tapping/evidence/](research/solo_tapping/evidence/)
altında üç JSON olarak donduruldu
(`scorer-diagnostics-20261013.json`, `score-redesign-20261013.json`,
`search-copy-control-20261013.json`); 223 test geçiyor.

## Şu an neredeyiz

**Adım 6'nın aracı kuruldu ve hazır bekliyor**: körleştirilmiş pairwise
dinleme çalışması — 12 çekişmeli validation kaynağı × 6 trial = 72
karşılaştırma (elite-vs-insan, elite-vs-copy, elite-vs-random,
uzak-elit-vs-insan, insan-vs-metronom anchor'ı, retest). Provenance sunucuda
mühürlü (`key.json` servis edilmiyor), sıra/taraf katılımcı başına rastgele,
yanıtlar lokal JSONL'e. Çalıştırmak için:

```sh
.venv/bin/python -m research.solo_tapping --port 8766 \
  --study artifacts/solo-study-20261013
# katılımcı: http://127.0.0.1:8766/study
# rapor: scripts/solo_tapping.py study-report --study artifacts/solo-study-20261013
```

**Bir sonraki somut iş**: gerçek, onamlı dinleyicilerle trial'ları koşmak.
İlk yanıtlar geldiğinde rapor yorumlanıp adım 7'nin (üret → karşılaştır →
geri bildirim → sabit held-out veride yeniden sına) tasarımına geçilecek.
Paralelde, uygulama hattındaki alignment ablation suite'i remote GPU'da
başlatılmayı bekliyor.

**Açık gate'ler** (hiçbiri kapatılmadan algısal/genelleme iddiası yok):
participant-held-out değerlendirme, pretraining-overlap rezervasyonu, gerçek
tek-el kayıtlar, bağımsız dinleme/çalınabilirlik yargıları. Başarı ölçütü
optimizasyon skorunun yükselmesi değil, **görülmemiş insan tapping'lerinde
daha uyumlu bulunan ve çeşitliliğini koruyan groove'lar**.
