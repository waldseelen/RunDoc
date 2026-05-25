```markdown
# Yapay Zeka Ajanı (Agent) Teknik Tasarım Dokümanı: Pandoc Orchestrator

Bu doküman, Pandoc'un tüm çapraz çeviri, filtreleme ve şablonlama yeteneklerini otomatize eden, Next.js ve Python (FastAPI) mimarisiyle çalışan yapay zeka ajanının (Agent) sistem mimarisini ve çalışma prensiplerini kapsamaktadır.

---

## 1. Ajan Tanımı ve Rolü (Agent Persona)

Ajan, kullanıcıdan gelen doğal dil talimatlarını, yapılandırılmamış girdi dokümanlarını ve hedef format gereksinimlerini analiz ederek en uygun Pandoc komut zincirini (pipeline) kuran, filtreleri yöneten ve çıktı doğrulaması yapan bir **Derleme ve Dönüşüm Orkestratörüdür**.

---

## 2. Sistem Mimarisi ve Veri Akışı

Ajan, stateless bir yürütme motoru (Python Worker) ile stateful bir yönetim arayüzü (Next.js & Supabase) arasında bir köprü görevi görür.


```

[Kullanıcı Arayüzü: Next.js] ---> [Orkestrasyon Katmanı: Next.js API & Supabase]
|
v
[İzole Docker Konteyneri] <------- [Ajan Karar Motoru: Python FastAPI]
├── Pandoc CLI & Lua/Python AST Filtreleri
└── TeX Live, Typst, WeasyPrint Motorları

```

---

## 3. Ajanın Çekirdek Bileşenleri (Core Agent Components)

### 3.1. Girdi Analizörü ve AST Çevirmeni
* **Görevi:** Girdi olarak verilen dosya tipini algılar. Eğer girdi ham metin ise içeriği analiz ederek başlık seviyelerini, kod bloklarını ve matematiksel ifadeleri tanımlar.
* **İşlem:** Dokümanı Pandoc'un Soyut Sözdizimi Ağacı (AST) biçimine (Haskell JSON yapısı) çevirerek manipülasyona hazır hale getirir.

### 3.2. Dinamik Komut ve Pipeline Oluşturucu
Ajan, kullanıcının nihai çıktı hedefine göre Pandoc CLI parametrelerini dinamik olarak üretir. 

#### Örnek Senaryo Matrisi:
* **Akademik PDF Talebi:**
  `pandoc input.md --citeproc --bibliography=ref.bib --pdf-engine=xelatex -V geometry:margin=1in -o output.pdf`
* **Kurumsal Word Raporu Talebi:**
  `pandoc input.md --reference-doc=company_template.docx --smart --toc -o output.docx`
* **Medya Ayıklamalı Dönüşüm:**
  `pandoc input.docx --extract-media=./extracted_media -t markdown -o output.md`

### 3.3. Filtre ve Eklenti Entegratörü (Sandboxing)
* **Lua Filtreleri:** Ajan, belge içi manipülasyonlar (örneğin tüm tabloları otomatik biçimlendirme veya belirli kelimeleri sansürleme) için yerleşik Lua scriptlerini dönüşüm zincirine enjekte eder: `--lua-filter=style.lua`.
* **Python Filtreleri:** Harici Python kütüphaneleri gerektiren karmaşık işlemler için `pandocfilters` veya `panflute` paketlerini kullanarak AST üzerinde değişiklik yapar.

---

## 4. Teknik Alt Yapı ve Ortam Gereksinimleri

Ajanın çalışacağı Python tabanlı backend ortamının (Docker imajı) minimum bileşen listesi:

```dockerfile
# Temel Pandoc ve Python ortamı
FROM python:3.11-slim

# Sistem bağımlılıklarının ve dönüşüm motorlarının kurulması
RUN apt-get update && apt-get install -y \
    pandoc \
    texlive-xetex \
    texlive-fonts-recommended \
    weasyprint \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Typst kurulumu
RUN curl -L [https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.gz](https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.gz) | tar xz -C /usr/local/bin

# Python filtre bağımlılıkları
RUN pip install fastapi uvicorn panflute pandocfilters

COPY ./agent /app
WORKDIR /app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

```

---

## 5. Ajan İş Akışı (Agent Execution Lifecycle)

1. **Yükleme ve Ayrıştırma (Ingestion):** Kullanıcı dokümanı, şablonu (`--reference-doc`) ve kaynakçayı (`.bib`) sisteme yükler. Ajan meta verileri (YAML front-matter) okur.
2. **Strateji Belirleme (Planning):** Çıktı formatına göre (PDF, HTML Slayt, DOCX) kullanılacak motor (`typst`, `xelatex`, `reveal.js`) ve tipografik kurallar (`--smart`) belirlenir.
3. **Yürütme ve Güvenlik (Execution):** Komut, izole Docker ortamında, belirlenen CPU/RAM sınırları dahilinde çalıştırılır. Harici filtreler izole edilir.
4. **Hata Yakalama ve İyileştirme (Error Recovery):** Eğer LaTeX derleme hatası (`missing font`, `undefined control sequence`) alınırsa, ajan hata logunu parse eder, eksik parametreyi veya font eşleşmesini düzeltip dönüşümü otomatik olarak yeniden dener.
5. **Teslimat (Delivery):** Çıktı dosyası ve ayıklanan medya varlıkları Supabase Storage'a aktarılarak Next.js arayüzüne indirme bağlantısı döndürülür.

```

```