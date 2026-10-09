# Dataset'i gör, seç, dinle

[explore_ingest.ipynb](explore_ingest.ipynb) üç adım içerir:

1. `train.npz`, `validation.npz`, `test.npz` içeren **HVO export klasörünü** seç.
2. Rastgele veya indeksle örnekler seç; piano roll ve audio playback ile incele.
3. Canonical ingest veya HVO export sırasında elenenleri nedenleriyle aç.

Proje kökünden açmak için:

```sh
cd v2
.venv/bin/python -m pip install -r notebooks/requirements.txt
.venv/bin/python -m jupyterlab notebooks/explore_ingest.ipynb
```

IDE içinde kernel olarak `v2/.venv/bin/python` seç. İlk seçim hücresinde:

```python
DATASET_DIR = 'data/my-hvo-export'
CANONICAL_RUN = None
```

Göreli yollar **v2/** dizinine göredir. `CANONICAL_RUN` dataset card'dan otomatik
bulunur. Remote bilgisayardan taşıdıysan canonical `runs/<run-id>` yolunu burada
belirt. HVO tek başına elenen MIDI'lerin ham kayıtlarını içermez; onları incelemek
istiyorsan canonical run'ı da koru.

Bu çalışma alanında hazır örnekler:

- `data/unified-hvo-fill-aware-final`: tam GMD'den üretilen güncel export;
  notebook'un varsayılan seçimidir.
- `artifacts/dataset-sample-check-20261009/hvo-final-v3`: Documents/datasets içindeki
  koleksiyonlardan seçilen örneklerin export'u; farklı eleme nedenlerini görmek
  için bu klasörü seçebilirsin.

Bu yerel çıktılar git'e dahil değildir. Sonuçlar ve bilinen dataset uyumsuzlukları
[doğrulama raporunda](../fill-preprocessing-validation.json) kayıtlıdır.

Örnek seçimi:

```python
SPLIT = 'train'       # validation veya test
INDICES = None        # rastgele; belirli örnekler için [0, 12]
N_RANDOM = 3
HAS_FILL = None       # hepsi; 1: fill var, 0: groove etiketi, -1: bilinmiyor
```

Hücreyi tekrar çalıştırmak yeni rastgele örnekler getirir. Her örnekte piano roll,
velocity, tempo, fill başlangıcı, kaynak ID'leri ve ▶ audio kontrolü görünür.
Audio **sentezlenmiş davul önizlemesi**dir; orijinal ses kaydı veya VST değildir.
Velocity ve HVO offset zamanlaması korunur. Piano roll'daki nota genişlikleri görsel
amaçlıdır; eğitim tensörü nota süresi içermez. `style` mevcut modelin sınırlı
vocabulary'sidir; ayrıntılı kaynak tarzları export manifestinde korunur.

Elenenler için `STAGE='canonical'` veya `'hvo'` seç, `REASON` ile filtrele ve listedeki
`row` değerini `REJECTED_ROW` alanına yaz. Detaylarda metadata, stream kararları,
nota grafiği ve uygunsa audio yer alır. Davul seçilmemişse ham MIDI yalnızca çizilir;
tempo eksik veya değişkense audio otomatik tempo varsayımıyla çalınmaz. Sentetik
kompozisyonun elenmesi halinde gösterilen grafik, birincil groove kaynağına aittir;
fill kaynağı ID'si detaylarda bulunur.

Eski export'lar da açılır; fill filtresi ve ayrıntılı HVO eleme listesi yalnızca yeni
export'larda mevcuttur. Eski canonical run'da rol metadata'sı yoksa yeniden export
onu tahmin etmez; rol-aware ingest'i yeniden çalıştırmak gerekir.

Notebook veri dosyalarını değiştirmez veya web araması yapmaz. Split listesi yalnızca
NPZ header'larını okur; seçilen örneğin tensörü satır bazında okunur. Sıkıştırılmış
NPZ içinde geç bir indekse erişim önceki byte'ların açılmasını gerektirebilir; çok
büyük dosyalarda rastgele erişim yavaşlayabilir. Paylaşmadan önce
**Clear All Outputs** ile yerel yolları, örnekleri ve gömülü audio çıktısını temizle.
