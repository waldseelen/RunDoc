Sunduğun liste Pandoc'un tüm yeteneklerini doğru ve eksiksiz bir şekilde özetliyor. Bu özelliklerin tamamını (özellikle dosya yükleme/indirme, gerçek zamanlı dönüşüm takibi, Lua/Python filtre yönetimi ve referans doküman yükleme gibi işlemleri) uçtan uca destekleyecek bir sistem için **Web uygulaması (Next.js)** mimarisi, masaüstüne kıyasla çok daha sürdürülebilir ve esnektir.

Masaüstü uygulamalarında (Electron vb.) yerel CLI çalıştırmak kolay görünse de, sistemde LaTeX motorlarının (pdflatex, xelatex), Python ortamlarının veya Typst gibi harici bağımlılıkların kurulu olmasını şart koşar. Bu da kullanıcı tarafında ciddi bir bağımlılık (dependency) cehennemi yaratır. Web mimarisinde ise tüm bu ağır iş yüklerini sunucu tarafında (Docker konteynerleri içinde) izole edip standart hale getirebiliriz.

Aşağıda, mevcut teknik yığınınla (Next.js, TypeScript, Python) tam uyumlu, tüm bu özellikleri kapsayan Ürün Gereksinimleri Dokümanı (PRD) yer almaktadır.

---

# ÜRÜN GEREKSİNİMLERİ DOKUMANI (PRD)

## 1. Ürün Genel Bakışı

Ürün, Pandoc’un tüm çapraz dosya dönüştürme, gelişmiş filtreleme, şablonlama ve akademik yayıncılık yeteneklerini modern bir arayüzle son kullanıcıya sunan SaaS tabanlı bir doküman yönetim ve dönüştürme platformudur.

### Hedef Kitle

* Akademisyenler ve araştırmacılar (LaTeX, Atıf yönetimi, PDF üretimi).
* Teknik yazarlar ve geliştiriciler (Markdown, Git entegrasyonu, API, API dokümantasyonu).
* Kurumsal kullanıcılar (Word/PowerPoint referans şablonu eşleme, raporlama).

---

## 2. Sistem Mimarisi ve Teknoloji Yığını

### Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + Shadcn UI

* **Monaco Editor:** Markdown, YAML, Lua ve Python kod bloklarının tarayıcıda sözdizimi renklendirmeli (syntax highlighting) olarak düzenlenmesi için.
* **TanStack Query:** Dosya yükleme statüleri, uzun süren PDF dönüşüm süreçlerinin asenkron takibi için.

### Backend (Orchestrator): Next.js Route Handlers (API) & Supabase

* **Supabase Auth & Storage:** Kullanıcı yönetimi, yüklenen kaynak dosyalar, özel şablonlar (`.docx`, `.pptx`), `.bib` kaynakçaları ve Lua filtre dosyalarının saklanması.
* **Supabase PostgreSQL:** İşlem geçmişi, kullanıcı konfigürasyon şablonları ve meta veri yönetimi.

### Worker Processing Layer (İşlem Motoru): Python (FastAPI / Celery)

* **Neden Python?** Ağır dosya manipülasyonları, Pandoc CLI süreç yönetimi (Subprocess), sistem seviyesinde hata yakalama ve kuyruk yönetimi için en kararlı ortamı sunması.
* **İşlem Ortamı:** Tüm dönüşüm motorunu (Pandoc, TeX Live, Typst, WeasyPrint, Python/Lua filtre bağımlılıkları) içeren izole bir **Docker** imajı.

---

## 3. Fonksiyonel Gereksinimler & Özellik Seti

### Modül 1: Çapraz Çeviri ve Dosya Yönetimi (Epik 1)

* **Çoklu Format Desteği:** Arayüz, kullanıcının girdi formatını (Markdown, DOCX, HTML, JSON vb.) ve hedef çıktı formatını seçebileceği dinamik bir matris sunmalıdır.
* **Girdi Tipleri:** Kullanıcı dosya yükleyebilmeli (Drag & Drop), url verebilmeli veya Monaco Editor içine doğrudan metin yazabilmelidir.
* **Toplu İşlem (Bulk Processing):** Birden fazla dosya yüklendiğinde ardışık olarak birleştirilme (`pandoc file1.md file2.md -o output.docx`) seçeneği sunulmalıdır.
* **Medya Ayıklama:** Zengin içerikli formatlar (`.docx`, `.epub`) yüklendiğinde, `--extract-media` parametresi tetiklenerek resimler Supabase Storage'a çıkartılmalı ve kullanıcıya bir medya kütüphanesi olarak gösterilmelidir.

### Modül 2: Gelişmiş PDF ve Sunum Motoru (Epik 2)

* **Motor Seçimi:** PDF çıktılarında kullanıcıya 3 farklı yol sunulmalıdır:
1. *Akademik:* LaTeX (XeLaTeX/Tectonic)
2. *Modern/Hızlı:* Typst
3. *Web Tabanlı:* HTML/CSS (WeasyPrint veya Paged.js)


* **Canlı Önizleme:** Tarayıcı tarafında PDF ve HTML slayt sunumlarının (`reveal.js`) eş zamanlı önizlemesi (iframe veya PDF.js ile) sağlanmalıdır.

### Modül 3: Akademik ve Matematiksel İşlemler (Epik 3)

* **Atıf Yönetimi:** Kullanıcı projesine `.bib` veya CSL JSON dosyası yükleyebilmelidir. Sistem, arka planda `--citeproc` motorunu çalıştırmalıdır.
* **Stil Kütüphanesi:** Popüler CSL stilleri (APA, MLA, Harvard, IEEE) arayüzde hazır şablon olarak sunulmalı, harici `.csl` yüklenmesine izin verilmelidir.
* **Matematik İşleme Seçenekleri:** Web tabanlı çıktılarda denklemlerin nasıl işleneceği (MathJax, KaTeX veya statik SVG resim) kullanıcıya seçtirilmelidir.

### Modül 4: Şablonlama ve Kurumsal Kimlik (Epik 4)

* **Referans Doküman Eşleme:** Kullanıcı kendi şablon `.docx` veya `.pptx` dosyasını sisteme yükleyip `--reference-doc` olarak kaydedebilmelidir. Sonraki dönüşümlerde bu dosyanın stilleri otomatik uygulanmalıdır.
* **Görsel Şablon Giydirme:** HTML ve LaTeX için özelleştirilmiş `--template` dosyaları oluşturulmasına ve bunların YAML üst verileriyle (Metadata) beslenmesine olanak tanınmalıdır.

### Modül 5: Programlama ve Filtre Yönetimi (Epik 5)

* **Lua ve Python Filtre Deposu:** Gelişmiş kullanıcılar için sisteme özel Lua eklentileri yükleme veya arayüzdeki editörde yazma imkanı tanınmalıdır.
* **Boru Hattı (Pipeline) Oluşturma:** Kullanıcı, dönüşüm zincirine birden fazla filtreyi sıralı olarak ekleyebilmelidir (`--lua-filter=f1.lua --filter=f2.py`).

---

## 4. Teknik Olmayan Gereksinimler (Performans & Güvenlik)

* **İzolasyon (Sandbox):** Kullanıcıların yüklediği harici Python veya Lua filtreleri sunucu güvenliğini tehdit etmeyecek şekilde tamamen izole edilmiş Docker konteynerlerinde, kısıtlı kaynak (CPU/RAM) ve zaman aşımı (Timeout) limitleriyle çalıştırılmalıdır.
* **Büyük Dosya Yönetimi:** Dönüşüm işlemleri asenkron olmalıdır. Next.js API yüklenen dosyayı aldıktan sonra Python worker kuyruğuna (Celery/Redis veya basit bir webhook yapısı) atmalı, işlem bitince veritabanı üzerinden UI'a "Tamamlandı" sinyali (SSE veya Polling ile) gönderilmelidir.
* **Tipografik Doğruluk:** Dönüşüm parametrelerinde `--smart` modu varsayılan olarak açık gelmeli, dil koduna göre doğru tırnak işaretleri yapılandırılmalıdır.