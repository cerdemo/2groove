# MIDI preprocessing — kullanım rehberi

`ingest_midi.py`, seçtiğin klasörün **tüm alt klasörlerini otomatik tarar** ve bulduğu
MIDI dosyalarını ortak bir veri yapısına dönüştürür. Tek MIDI dosyası veya ZIP arşivi
de girdi olabilir. Kaynak dosyaları değiştirmez veya silmez; model eğitimi başlatmaz.

## 1. Terminali hazırlama

Proje kökünden `v2` klasörüne geç:

```sh
cd v2
```

Aşağıdaki komutlar mevcut `v2/.venv` ortamını doğrudan kullanır; ayrıca activate
etmen gerekmez. Başka bir bilgisayarda ortam kurulumu için [ana README](../README.md#run).
Komutlardaki örnek girdi yollarını kendi dosya/klasör yollarınla değiştir.

## 2. Bir klasörü ve tüm alt klasörlerini işle

```sh
.venv/bin/python scripts/ingest_midi.py \
  --input "/Users/kullanici/Music/MIDI Library" \
  --output data/my-midi-corpus
```

`--recursive` gibi ek bir seçenek gerekmez. Örneğin şu yapıda üç MIDI de bulunur:

```text
MIDI Library/
├── funk/
│   ├── take01.mid
│   └── session02/
│       └── take02.MIDI
└── jazz/
    └── takes.zip
        └── drummer/session03/take03.mid
```

Buradaki seçim terminalde `--input` ile yol vermektir; uygulamada bir klasör seçme
düğmesi henüz yok. macOS'ta Finder'dan klasörü terminale sürükleyerek de yolunu
ekleyebilirsin. Boşluk içeren yolları yukarıdaki gibi tırnak içine al.

Tarama `.mid`, `.midi`, `.kar`, `.smf`, `.rmi`, `.rmid` uzantılarını büyük/küçük
harf ayrımı olmadan tanır. ZIP içindeki alt dizinleri de tarar, arşivi diske açmaz.
Uzantısız dosyalar, ZIP içinde ZIP ve DAW proje dosyaları desteklenmez. Tarama
sırasında karşılaşılan sembolik bağlantı dosyaları, `.git`, `.venv`, `node_modules`,
`__pycache__`, mevcut çıktı ve web önbellek dizinleri işleme alınmaz.

**Bulunması, eğitim için kabul edildiği anlamına gelmez.** İçerik parse edilir,
metadata ve davul partileri değerlendirilir; aşağıdaki kabul kuralları uygulanır.
Boş bir klasörde rapordaki `assets` değeri sıfır olur.

### Önce küçük bir deneme: `--max-files`

İlk 20 MIDI adayını işlemek için:

```sh
.venv/bin/python scripts/ingest_midi.py \
  --input "/Users/kullanici/Music/MIDI Library" \
  --output data/midi-smoke-test \
  --max-files 20 \
  --web-mode off
```

`--max-files` hem `--input` hem `--config` ile çalışır. Pozitif tamsayı ister;
verilmezse config'teki `max_files` kullanılır, o da yoksa sınır uygulanmaz.
Config JSON'unun en üst seviyesine `"max_files": 20` eklenebilir; CLI değeri bunu
geçersiz kılar.

Sınır **kabul edilen değil, incelenen aday sayısıdır**: elenen/karantinaya alınan,
bozuk veya aynı içeriğin başka bir dosyadaki kopyası olan adaylar da sayılır.
ZIP içindeki her MIDI ayrı sayılır; okunamayan ZIP için üretilen hata kaydı da
bir adaydır. Birden fazla kaynakta sınır tüm çalışma için ortaktır. Kaynaklar
config sırasıyla, dosyalar sıralı yollarıyla, ZIP üyeleri isim sırasıyla işlenir;
bu rastgele veya temsili bir örnekleme değildir.

Rapor ve kaydedilen config sınırı içerir. `limit_reached: true`, sınıra ulaşıldığını
gösterir; arkada kaç dosya kaldığı sayılmaz. Sınır dosya işleme ve buna bağlı web
işlemlerini kısaltır; mevcut keşif aşaması klasör yollarını önceden listeleyebilir.
Örnekte `--web-mode off` ağ aramasını da kapatır; web fallback'i denemek için bunu
kaldırabilirsin. Test çıktısını tam corpus'tan ayrı tutmak için ayrı `--output`
kullan. Alt kümenin split/duplicate denetimi yalnızca işlenen adayları kapsar.

## 3. Tek dosya veya ZIP işle

```sh
.venv/bin/python scripts/ingest_midi.py \
  --input "/Users/kullanici/Music/funk_120bpm.mid" \
  --output data/single-file
```

```sh
.venv/bin/python scripts/ingest_midi.py \
  --input "/Users/kullanici/Music/drum-collection.zip" \
  --output data/zip-corpus
```

Tek dosya verilirse yalnızca o dosya işlenir; komşu klasörler taranmaz.
`--input` hızlı kullanımı generic adapter ve General MIDI davul eşlemesini kullanır.
Roland TD-11, özel nota eşlemeleri, resmi dataset manifestleri veya birden fazla
kaynak için yapılandırma dosyası kullan.

## 4. Metadata, web araması ve eleme

Alanlar ayrı ayrı çözülür: tempo MIDI event'inden, tarz klasör adından gelebilir.
MIDI metadata/text, bilinen dataset manifesti veya sidecar, track/instrument adı,
dosya/klasör adı ve kaynak varsayımları incelenir. Zorunlu alan hâlâ eksikse,
arama yapılabilecek bir eser kimliği bulunduğunda web aşamasına geçilir.
Güvenilir kaynaklar çelişirse varsayılan davranış karantinadır.

`--input` için varsayılan web modu `auto`: MusicBrainz kullanılır; ortamda
`BRAVE_SEARCH_API_KEY` tanımlıysa Brave araması da kullanılabilir. Genel web
araması anahtarsız çalışmaz. Varsayılan istek bütçesi çalışma başına 100'dür.
Web'e eser adı/sanatçı sorgusu gider; MIDI içeriği yüklenmez. Bir kaydın internette
bulunan BPM değeri, bu MIDI düzenlemesinin temposu olarak doğrudan kabul edilmez.

İnternete çıkmadan çalıştırmak için:

```sh
.venv/bin/python scripts/ingest_midi.py \
  --input "/Users/kullanici/Music/MIDI Library" \
  --output data/my-midi-corpus \
  --web-mode off
```

`cache` yalnızca mevcut web önbelleğini kullanır. Diğer seçenekler `musicbrainz`,
`brave`, `auto` ve `off`. Config kullanıldığında config içindeki mod geçerlidir;
`--web-mode` bunu o çalıştırma için değiştirir.

Varsayılan kabul için **tarz + açık tempo bilgisi + yeterli davul kanıtı** gerekir.
Tempo yoksa otomatik 120 BPM uydurulmaz. Sadece kanal 10'a bakılmaz; isimler,
program/bank bilgisi ve nota davranışı birlikte değerlendirilir. Davul tespiti
heuristic olduğu için belirsiz dosyalarda inceleme gerekir.

- `accepted`: mevcut kabul kurallarını karşılayan dosya.
- `discarded`: örneğin gerekli metadata veya yeterli davul kanıtı bulunamadığı
  için dataset'e alınmayan dosya. **Orijinal dosya silinmez.**
- `quarantined`: çelişki, belirsizlik veya desteklenmeyen içerik nedeniyle
  incelemeye ayrılan dosya.

Tarzı bilinen bir koleksiyonda `funk/` gibi açık klasör etiketleri veya
`take01.mid` yanında `take01.metadata.json` kullanılabilir. Sidecar örneği:

```json
{"style": "funk", "tempo": 120, "meter": "4/4"}
```

Bu bilgileri yalnızca gerçekten biliniyorsa ekle; tüm dosyalara keyfi tarz/tempo
vermek veri kalitesini düşürür. Ayrıntılı kanıt öncelikleri, eşikler ve inceleme
annotation formatı [PREPROCESSING.md](../PREPROCESSING.md) içinde.

## 5. Sonuçları bulma

Her çalıştırma ayrı bir timestamp klasörü oluşturur:

```text
data/my-midi-corpus/
├── latest.json
└── runs/
    └── <timestamp-config-hash>/
        ├── report.json
        ├── manifest.jsonl
        ├── review-queue.json
        ├── web-requests.jsonl
        ├── records/
        └── objects/
```

- `latest.json`: son tamamlanan çalışmanın yolu ve raporu.
- `report.json`: bulunan dosya sayısı, karar sayıları ve veri kalite özeti.
- `manifest.jsonl`: her dosyanın kabul/eleme kararı, gerekçeleri ve kayıt yolu.
- `review-queue.json`: insan incelemesi için kayıtlar.
- `records/`: ayrıntılı metadata kanıtları, nota olayları ve davul değerlendirmesi
  içeren sıkıştırılmış JSON kayıtları.
- `objects/`: okunabilen kaynakların içerik hash'i ile saklanan ham kopyaları.
- `web-requests.jsonl`: web çözümleme kaydı.

Hızlı rapor görüntüleme:

Grafikler ve tekil groove incelemesi için [dataset exploration notebook'unu](../notebooks/README.md)
açabilirsin; `DATASET` değerini bu çalışmanın output klasörüne ayarla.

```sh
.venv/bin/python -m json.tool data/my-midi-corpus/latest.json
```

Aynı komutu tekrar çalıştırmak yeni bir run oluşturur; önceki sonuçları ezmez.
Bu işlem bir resume değildir: kaynaklar yeniden değerlendirilir, web önbelleği
uygunsa yeniden kullanılır.

## 6. GMD, özel eşlemeler ve birden fazla kaynak

Mevcut GMD koleksiyonu için resmi manifest ve TD-11 eşlemesini kullanan config:

```sh
.venv/bin/python scripts/ingest_midi.py --config configs/ingest-gmd.json
```

Kendi koleksiyonun için `configs/ingest-mixed.example.json` dosyasını kopyala;
`sources` içindeki yolları, benzersiz kaynak ID'lerini ve davul eşlemelerini düzenle.
Her kaynak klasörse alt klasörleri yine otomatik taranır. Örnek config'teki
placeholder yolları değiştirmeden çalıştırma.

```sh
.venv/bin/python scripts/ingest_midi.py \
  --config configs/my-library.json \
  --output data/my-midi-corpus
```

`--config` ve `--input` birlikte kullanılamaz. Config içindeki göreli yollar config
dosyasına değil, komutu çalıştırdığın dizine göre çözülür; bu örneklerde `v2/`.
`--output` verilmezse config değeri; doğrudan `--input` kullanımında `data/unified`
kullanılır. `--input` kaynağının ID'si `local-midi` olur; kalıcı çok kaynaklı
koleksiyonlarda açık ID'leri olan config tercih et.

## 7. Model eğitimi için HVO çıktısı üretme

Canonical corpus notaların ayrıntılı zamanlamasını korur. Mevcut CVAE için ayrıca
32 adım × 9 davul sesi biçiminde hit/velocity/offset (HVO) export istenebilir:

```sh
.venv/bin/python scripts/ingest_midi.py \
  --input "/Users/kullanici/Music/MIDI Library" \
  --output data/my-midi-corpus \
  --export-hvo data/my-hvo-export-01
```

HVO hedefi **henüz mevcut olmayan bir dizin** olmalı. Export daha dar kurallar
kullanır: iki ölçü 4/4, temsil edilebilir davul sesleri ve pencere içinde sabit
tempo gerekir; grid çakışması fazla olan pencereler elenir. Canonical corpus'ta
kabul edilmiş her dosya HVO örneği üretmeyebilir. Çıktıdaki dataset card ve
manifesti kontrol et. Bu komut eğitimi başlatmaz.

Tüm CLI seçenekleri:

```sh
.venv/bin/python scripts/ingest_midi.py --help
```

## 8. Groove + fill veri üretimi

Yeni exporter, rolü bilinen groove ve fill'leri aynı split, stil ve varsayılan olarak
aynı kaynak içinde eşleştirir. 8 beat hedefte, örneğin 2 beat fill için groove'un ilk
6 beat'i tutulur. `has_fill`, fill maskeleri ve iki kaynağın ID'leri çıktıya eklenir.
Rolü bilinmeyen örnekte `has_fill=-1` olur; bilinmeyen veri “fill yok” diye etiketlenmez.

Çoklu dataset config örneği: `configs/ingest-groove-fill.example.json`.
İçindeki yolları/eşlemeleri düzenleyip:

```sh
.venv/bin/python scripts/ingest_midi.py \
  --config configs/my-remote-datasets.json \
  --export-hvo data/my-fill-aware-hvo
```

Varsayılan phrase sınırı, fill'in son onset'inden sonraki 4-beat bar çizgisinden
**türetilir ve bu varsayım kaydedilir**. İki beat gibi doğrulanmış özel uzunluklar
sidecar'da `"phrase_beats": 2` ile verilebilir. `hvo.fill_boundary="strict"` seçilirse
çıkarım yapılmaz. Rol için `"role": "groove"` / `"fill"` / `"mixed"` kullanılabilir.
Uzun fill'ler sessizce kesilmez; son notanın sonraki barın downbeat'i olması kısa
fill kombinasyonunu engelleyebilir. Tempo uyarlaması ve kombinasyon sayısı sınırı
config'de açıkça tanımlıdır.

[Detaylı kurallar ve remote kullanım](../PREPROCESSING.md#groovefill-roles-and-composition-2026-10-09)
ve [sade exploration notebook'u](../notebooks/README.md) ile sonuçları kontrol et.
Bu preprocessing güncellemesi mevcut modelin fill conditioning eğitimini yapmaz.

### GigaMIDI / Lucerne

GigaMIDI dahil toplu remote kaynak listesi:
[`configs/ingest-remote.example.json`](../configs/ingest-remote.example.json).
`/datasets` yolunu remote konumuyla değiştir; GMD yolunu ayrıca kontrol et.
GigaMIDI için `train_80/`, `validation_10/`, `test_10/` ve metadata CSV'sini aktar.
İlk boyut/kaynak kullanımı kontrolünü aşağıdaki tek kaynak config'iyle yap;
toplu config'de `--max-files` yalnızca ilk kaynaklara ulaşabilir. Henüz mapping
profili tamamlanmayan diğer kaynakların inceleme/dışlama kuralları korunur.

Bu iki dataset için `--input` tek başına generic adapter kullanır. Dataset'e özgü
metadata ve timing işlemleri için `--config` kullan:

```sh
# v2 içinden; önce config'deki /path/to/datasets yolunu değiştir.
.venv/bin/python scripts/ingest_midi.py --config configs/ingest-gigamidi.example.json --max-files 40
.venv/bin/python scripts/ingest_midi.py --config configs/ingest-lucerne.example.json --export-hvo data/lucerne-hvo
```

GigaMIDI ilk çalışmada CSV'nin tamamını SQLite'a indeksler; `--max-files` bu ilk
indekslemeyi değil, işlenen MIDI sayısını sınırlar. Sonraki çalışmalarda indeks
kullanılır. Lucerne için `stimuli.csv`, `events.csv` ve meter için `RPP/` klasörünü
koru. Ayrı örnek klasörü kullanıyorsan source içindeki `metadata_path`, GigaMIDI'de
CSV dosyasına, Lucerne'de asıl dataset klasörüne işaret etmeli.

Notebook'ta `DATASET_DIR = 'data/lucerne-hvo'` seçerek çıktıyı açabilirsin.
HVO dışlamalarının nedenleri de aynı notebook'tan incelenebilir.
Ayrıntılar ve kısıtlar: [dataset adapter'ları](../PREPROCESSING.md#gigamidi-and-lucerne-adapters).
