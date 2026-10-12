# Eğitim öncesi kontrol ve veri hazırlığı

Yeni groove encoder eğitimi ve TapTamDrum/contrastive geliştirme sırası için
[CONTRASTIVE.md](CONTRASTIVE.md). Aşağıdaki audit, plan ve cache bu encoder'a girdi olur.

Bu script'ler tamamlanmış `hvo32x9-fill-v2` export üzerinde çalışır. MIDI ingest veya
kombinasyon üretimi tekrarlanmaz. Girdi dosyaları değiştirilmez, split'ler yeniden
atanmaz. GPU gerekmez. Komutları **remote'da `v2` içinden** çalıştır.

Aşağıdaki output klasörleri yeni olmalı. Yeniden denemede farklı output adı kullan;
başarısız çalışmanın yarım dosyalarını tamamlanmış çıktı sayma.

## 1. Son export'u denetle

```bash
python scripts/audit_hvo.py \
  --dataset data/2groove2-hvo-5m-retry \
  --canonical-run data/2groove2-canonical/runs/20261009T150754276820Z-a30858d9 \
  --output artifacts/pretrain-audit
```

`audit.json` içinde `status: passed` beklenir. Hata varsa exit code **2** olur ve
ikinci script bu audit'i kabul etmez. `--canonical-run` verilmezse dataset card'daki
yol kullanılır; başka bilgisayara kopyalarken yolu belirt. Canonical run'ın
`manifest.jsonl` dosyası yeterlidir; bu audit ham MIDI objelerini açmaz.

Kontroller:

- Bütün split'lerde **tüm satırlar**: array şekilleri/dtype, finite HVO/BPM,
  binary hit, velocity/offset sınırları, inaktif hücreler ve tutarlı satır sayıları.
- `has_fill`, `synthetic`, başlangıç/süre, `fill_mask`, gerçek onset üzerinden
  `fill_hit_mask`; periyodik grid'in sıfırıncı hücresindeki negatif offset korunur.
- NPZ ile export manifest'i arasında indeks, metadata ve yeniden hesaplanan
  HVO/structure hash tutarlılığı; dataset-card sayıları.
- Parent'ların canonical manifest'te accepted olması; parent, kaynak, stil,
  split ve group ilişkileri; seçilmiş parent'ların canonical örüntü hash'leri.
- **Son export'ta kalan** split'ler arası HVO tekrarları ve parent/group çakışmaları.
  Eski export raporundaki ayıklama öncesi sayaçlar burada kullanılmaz.

Rapor ayrıca source × tam stil etiketleri × fill × original/synthetic dağılımını,
10 BPM aralıklarını, en çok parent tekrarını ve canonical dışlamaları kaynak bazında
verir. `audit.sqlite`, milyonlarca satırın detaylarını diskte tutar; büyük JSON
manifest'in tamamı RAM'e yüklenmez. NPZ üyeleri sırayla ve varsayılan 1024 satırlık
parçalarla okunur (`--batch-size`). Dosya SHA256'ları kaydedilir; tarama sırasında
veya sonrasında değişen girdiler eski audit ile kullanılamaz.

Ortak **hit grid** sayısı uyarıdır: ortak ritmik sözlük veya olası yakın tekrarlar
olabilir; kendiliğinden leakage kanıtı değildir. Exact hash dört ondalığa yuvarlanmış
HVO'dur. Yakın müzikal tekrarlar, yanlış kaynak mapping'i, stil doğruluğu ve gerçek
fill kalitesi bu kontrollerle ispatlanmaz.

## 2. Dengeli eğitim planı hazırla

```bash
python scripts/prepare_training.py \
  --audit artifacts/pretrain-audit \
  --output artifacts/pretrain-plan \
  --seed 42 \
  --synthetic-ratio 1 \
  --max-per-groove 4 \
  --max-per-fill 32 \
  --unknown-fill-mass 0.1
```

Varsayılanlar bir başlangıç politikasıdır, optimize edilmiş hiperparametreler değil:

- Tüm orijinal **train** satırları tutulur. Sentetik train satırları en fazla
  orijinal sayısı kadar seçilir. `--synthetic-ratio 0` sentetikleri kapatır.
- Sentetik seçim source/tam-stil kümeleri arasında sırayla, seed ile deterministik
  yapılır. Parent **groove dosyası** başına en fazla 4, parent **fill dosyası** başına
  en fazla 32 satır tutulur; bunlar pencere başına limit değildir. Uygun eşleşme azsa
  hedefin altında kalınır ve raporlanır.
- Sampling ağırlıkları önce fill sınıfına %45 no-fill, %45 fill, %10 unknown kütle
  ayırır. Her sınıf içinde original/synthetic, kaynak, tam stil kümesi ve parent
  dosyası seviyelerinde eşit paylaştırır; aynı parent'ın pencereleri payını bölüşür.
  Eksik sınıflarda mevcut kütleler normalize edilir. `plan.json` gerçekleşen beklenen
  oranları verir. **Seçilen sentetik oranı ile sampling olasılığı aynı şey değildir.**
- Ağırlıklar replacement sampling içindir; her batch'te kesin kota garantisi yoktur.
  Parent cap'leri tutulan havuza uygulanır; örnekleme aynı satırı tekrar çekebilir.
  `effective_sample_size = 1 / sum(weight²)` ve `max_row_probability` yoğunlaşmayı
  gösterir. Effective sample size havuzun %25'inden azsa uyarı çıkar; bu eşik bir
  kalite garantisi değildir. Nadir kaynak/stil veya orijinal fill örneklerine fazla
  ağırlık düşebilir; bu raporu incelemeden varsayılanları eğitim politikası sayma.
- Unknown fill etiketi **-1 kalır**; fill loss/metric hesaplarında maskelenmelidir.
  Unknown satırlar diğer öğrenme hedeflerinde kullanılabilir.

Çıktılar:

- `train-plan.npz`: `index` orijinal `train.npz` satırı, `weight` normalize sampling
  olasılığı; `has_fill`, `synthetic`, tam stiller için CSR `style_indptr/style_ids`.
- `style-vocabulary.json`: **yalnızca train etiketlerinden** oluşturulan çok etiketli
  sözlük. Eski yedi kategorilik `style` alanını değiştirmez. Validation/test'te ilk
  kez görülen etiketler raporlanır ve gelecekteki loader'da 0'a eşlenmelidir.
- `evaluation-indexes.npz`: validation/test için `*_all`, `*_original`, `*_synthetic`,
  `*_no_fill`, `*_with_fill`, `*_unknown_fill`. İndeksler sabittir, yeniden split veya
  resampling yapılmaz. Original/synthetic ayrı metrikler üretmeli; tuning test'i
  kullanmamalı. Fill alt kümeleri origin alt kümeleriyle kesişir.
- `train-manifest.jsonl`, `selection.sqlite`: seçilmiş satırların provenance bilgisi.
- `review-examples.jsonl`: kaynak/stil/fill/origin tabakalarından inceleme adayları.
- `plan.json`: tamamlanma işareti, ayarlar, girdi/çıktı fingerprint'leri ve loader
  sözleşmesi. Bu dosya yoksa hazırlık tamamlanmamıştır.

## 3. Dinleme ve görsel kontrol paketi üret

```bash
python scripts/review_pretraining.py \
  --plan artifacts/pretrain-plan \
  --output artifacts/pretrain-review \
  --max-examples 24 \
  --plots
```

Her örnek için MIDI, WAV, isteğe bağlı piano roll PNG ve `review.json` üretir.
`--plots` için matplotlib gerekir (notebook bağımlılıklarında mevcut); kurulu değilse
bu flag'i çıkar. WAV, mevcut dokuz sesli basit sentezdir; kaynak VST tınısı değildir.
MIDI önizlemesi 960 PPQ'ya yuvarlanır; HVO verisi değişmez. Sıkıştırılmış tensorler
split başına en fazla bir kez sırayla taranır, her örnek için baştan açılmaz.

Tempo/microtiming, ses eşlemesi, groove–fill geçişi, fill sınırı ve etiketleri dinle.
Paket otomatik onay vermez; `review_status` başlangıçta `pending` olur. Notebook'ta
aynı örneği açmak için JSON'daki `split` ve `index` değerlerini kullan. Gerekirse
metadata/mapping düzeltmesine dön; her sorun için tüm MIDI ingest'i tekrarlamak
zorunlu değildir, fakat eski audit değişmiş girdilerle kullanılamaz.

## 4. Eğitim loader'ı için NPY cache oluştur

```bash
python scripts/cache_hvo.py \
  --audit artifacts/pretrain-audit \
  --output data/2groove2-hvo-mmap
```

NPZ içeriğini değiştirmeden `train/`, `validation/`, `test/` altında ayrı `.npy`
dosyaları oluşturur. `cache.json` ancak başarıyla bitince yazılır. Kullanıcının
1.363.507 satırlık export'u için sayısal dizilerin toplamı yaklaşık **5,2 GB**
sıkıştırılmamış alan tutar; audit/selection SQLite ve geçici sıralama alanı buna
eklenir. Kaynak NPZ dosyaları da korunur.

Gelecekteki loader için örnek erişim:

```python
import numpy as np

plan = np.load('artifacts/pretrain-plan/train-plan.npz', allow_pickle=False)
drums = np.load('data/2groove2-hvo-mmap/train/drums.npy', mmap_mode='r', allow_pickle=False)
rng = np.random.default_rng(42)
positions = rng.choice(len(plan['index']), size=128, replace=True, p=plan['weight'])
rows = plan['index'][positions]
batch = drums[rows]
# Conditioning etiketleri plan satırıyla, ham BPM/maskeler orijinal rows ile seçilir.
```

**Mevcut `scripts/train.py` bu planı veya yeni conditioning alanlarını henüz
kullanmıyor.** Bu script'ler eğitim başlatmaz; eski trainer'ı doğrudan bu export'a
yöneltmek dengeleme/fill conditioning sağlamaz. Sonraki model/trainer çalışması
plan indekslerini, ağırlıkları, multi-label stilleri, unknown maskelerini ve sabit
evaluation kümelerini gerçekten tüketmelidir.
