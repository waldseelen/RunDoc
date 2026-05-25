Pandoc’un sahip olduğu tüm yeteneklerin, esnekliklerin ve işlem tiplerinin eksiksiz ve kategorize edilmiş listesi:
## 1. Belge ve Format Dönüşümleri (Çapraz Çeviri)

* Hafif İşaretleme Dilleri (Lightweight Markup): Markdown (tüm türleri), reStructuredText, AsciiDoc, Emacs Org-Mode, Textile ve Djot formatlarını birbirine dönüştürür.
* Kelime İşlemci ve Ofis Belgeleri: Microsoft Word (.docx), OpenOffice/LibreOffice (.odt) ve Rich Text Format (.rtf) dosyalarını okur ve sıfırdan oluşturur.
* Web ve Sayfa Formatları: HTML4, HTML5, Typst, InDesign (.icml) ve XHTML belgeleri üretebilir veya bunları girdi olarak kabul edebilir.
* E-Kitap Yayıncılığı: EPUB (Sürüm 2 ve 3) ile FictionBook2 (.fb2) formatlarında e-kitaplar basabilir.
* Akademik ve TeX Dizgileri: LaTeX ve ConTeXt kodlarını okuyarak diğer formatlara aktarır ya da tam tersini yapar.
* Wiki Altyapıları: MediaWiki, DokuWiki, Jira Wiki, TWiki, Vimwiki ve XWiki formatları arasında çift yönlü çeviri yapar.
* Teknik Dokümantasyon: GNU TexInfo, roff man, roff ms ve Vimdoc kılavuz sayfalarını hazırlar.
* Veri ve Programlama Formatları: Jupyter Notebook (.ipynb), CSV/TSV tabloları, Microsoft Excel (.xlsx), XML, JSON ve Haskell AST yapılarını işler. [1, 2, 3] 

## 2. PDF Üretimi ve Sayfa Tasarımı

* LaTeX Motorları ile PDF: pdflatex, lualatex, xelatex, tectonic kullanarak akademik kalitede PDF basar.
* HTML/CSS ile PDF: wkhtmltopdf, weasyprint, prince veya pagedjs-cli kullanarak web teknolojileriyle PDF tasarlar.
* Alternatif Motorlar ile PDF: Typst (typst), ConTeXt (context) veya groff (pdfroff) altyapılarını kullanarak PDF belgeleri oluşturur. [3] 

## 3. Sunum ve Slayt Hazırlama

* HTML/JS Slaytları: Markdown metinlerini reveal.js, Slidy, Slideous, S5 ve DZSlides formatlarında tarayıcıda çalışan dinamik sunumlara dönüştürür.
* Ofis Sunumları: Doğrudan Microsoft PowerPoint (.pptx) formatında sunum dosyası oluşturur.
* Akademik Slaytlar: LaTeX tabanlı profesyonel Beamer sunum kodları üretir. [2, 3] 

## 4. Akademik Yazım ve Kaynakça (Citation) Yönetimi

* Atıf ve Kaynakça Bağlama: citeproc motoru sayesinde BibTeX (.bib), BibLaTeX, CSL JSON/YAML ve EndNote XML veritabanlarını metne entegre eder.
* Akademik Standart Uygulama: CSL (Citation Style Language) dosyalarını okuyarak metin içi atıfları APA, MLA veya Harvard gibi binlerce farklı dergi standartına göre otomatik biçimlendirir. [2] 

## 5. Matematik ve Formül İşleme

* Web Uyumlu Formüller: LaTeX formatındaki matematiksel denklemleri web çıktılarında görünmesi için MathJax, MathML, KaTeX veya GladTeX biçimlerine dönüştürür.
* Görsel Formüller: Matematiksel denklemleri internet bağlantısı olmadan çalışabilen statik görüntülere (gömülü resimlere) çevirir.

## 6. Gelişmiş Özelleştirme ve Şablonlama (Templating)

* Dış Görünüm Şablonları: --template parametresiyle özel HTML, Word veya LaTeX şablonları giydirerek çıktı tasarımını tamamen kontrol eder.
* Kurumsal Kimlik Uyumu: Hazır bir Word (.docx) veya PowerPoint (.pptx) dosyasını --reference-doc olarak hedef gösterip, yeni üretilen belgenin o dosyadaki yazı tiplerini, renkleri ve başlık stillerini birebir kopyalamasını sağlar.
* Üst Veri (Metadata) Yönetimi: YAML blokları veya -M parametresi ile belgeye dinamik başlık, yazar, tarih ve özel değişkenler tanımlar. [3, 4] 

## 7. Programlama ve Genişletilebilirlik (Eklentiler)

* Lua Filtreleri: Yerleşik Lua yorumlayıcısı ile dönüştürme esnasında belgenin mantıksal ağacına (AST) müdahale eder, metinleri veya tabloları programatik olarak değiştirir.
* Harici Filtreler (Python/Node.js): JSON formatında girdi-çıktı kabul eden herhangi bir dille (özellikle Python) harici eklentiler/filtreler yazılmasına imkan tanır.
* Özel Okuyucu ve Yazıcılar: Pandoc'un standart olarak desteklemediği tamamen yeni bir dosya formatı için Lua dilinde sıfırdan okuma/yazma motoru geliştirilmesini sağlar. [3] 

## 8. Dosya ve İçerik Manipülasyonu

* Belge Birleştirme: Birden fazla farklı girdi dosyasını tek bir komutla ardışık olarak birleştirip tek bir çıktı dosyasında toplar.
* Medya Ayıklama: --extract-media komutuyla .docx veya .epub gibi paketlenmiş dosyaların içindeki resimleri ve videoları dışarıya klasör olarak çıkartır ve metindeki bağlantıları günceller.
* Tipografik Düzeltme: --smart modu aktif edildiğinde düz tırnakları akıllı (eğri) tırnaklara, peş peşe gelen çizgileri (-- veya ---) tipografik tirelere çevirir.
* Sözdizimi Renklendirme: Kod bloklarını (```python gibi) algılar ve çıktı formatına uygun şekilde (HTML CSS'leri veya Word stilleriyle) renklendirir. [3, 4, 5, 6, 7] 
