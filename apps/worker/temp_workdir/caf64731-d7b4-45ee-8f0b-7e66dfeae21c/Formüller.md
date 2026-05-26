# 📐 EEE-210 – Yarıiletken Fiziği ve Mikroelektronik Elemanlar Tam Formül Kılavuzu

# 🔵 CH1 – Semiconductor Fundamentals (Yarıiletken Temelleri)

## 1. Fermi-Dirac Dağılımı ve Boltzmann Yaklaşımı

Elektronların belirli bir $E$ enerji seviyesinde bulunma olasılığı:

$$f(E) = \frac{1}{1 + e^{(E - E_F)/kT}}$$

Oda sıcaklığında ($T = 300\text{ K}$) termal enerji sabiti:

$$kT \approx 0.0259\text{ eV} \quad (\text{Pratik sınavlarda } 0.026\text{ eV} \text{ alınabilir.})$$

> **⚠️ Boltzmann Yaklaşımı Sınırı (**$E - E_F \gg kT$**):**
> 
> Enerji seviyesi Fermi seviyesinden çok yukarıda olduğunda olasılık fonksiyonu üstele yaklaşır:
> 
> $$f(E) \approx e^{-(E - E_F)/kT}$$

## 2. Durum Yoğunluğu & Efektif Durum Yoğunluğu

Yarıiletkende birim hacim ve birim enerji başına düşen kuantum durumlarının sayısı:

$$N(E) = \frac{4\pi}{h^3}(2m_e^*)^{3/2}(E - E_c)^{1/2}$$

İletim ve valans bantları için efektif durum yoğunlukları ($N_c$ ve $N_v$):

$$N_c = 2\left(\frac{2\pi m_e^* kT}{h^2}\right)^{3/2} \qquad N_v = 2\left(\frac{2\pi m_h^* kT}{h^2}\right)^{3/2}$$

> **💡 Sıcaklık Ölçeklendirmesi (**$N_c, N_v \propto T^{3/2}$**):**
> 
> Farklı bir $T_2$ sıcaklığındaki efektif durum yoğunluklarını bulmak için oranlama formülü:
> 
> $$N_c(T_2) = N_c(T_1)\left(\frac{T_2}{T_1}\right)^{3/2} \qquad N_v(T_2) = N_v(T_1)\left(\frac{T_2}{T_1}\right)^{3/2}$$

## 3. Taşıyıcı Konsantrasyonu

İletim bandındaki elektron ($n$) ve valans bandındaki delik ($p$) konsantrasyonları:

$$n = N_c e^{-(E_c - E_F)/kT} \qquad p = N_v e^{-(E_F - E_v)/kT}$$

İntrinsik (katkılanmamış) Fermi seviyesi ($E_i$) referans alınarak:

$$n = n_i e^{(E_F - E_i)/kT} \qquad p = n_i e^{(E_i - E_F)/kT}$$

## 4. Kütle-Etki Yasası (Mass-Action Law) ve İntrinsik Konsantrasyon

Termal dengedeki yarıiletkenler için en temel eşitlik:

$$n \cdot p = n_i^2$$

_(CH1 Q2, Q5, Q6 ve Q7 sorularının çözümünde doğrudan kullanılır.)_

İntrinsik taşıyıcı konsantrasyonu ($n_i$):

$$n_i^2 = N_c N_v e^{-E_g/kT} \implies n_i = \sqrt{N_c N_v} e^{-E_g/2kT}$$

> **📊** $300\text{ K}$ **Sıcaklıkta Malzeme Sabitleri:**
> 
> - **Silisyum (Si):** $n_i = 1.5 \times 10^{10}\text{ cm}^{-3}$ (veya soruda verilirse $10^{10}\text{ cm}^{-3}$)
>     
> - **Germanyum (Ge):** $n_i = 2.4 \times 10^{13}\text{ cm}^{-3}$  
>     
> - **Galliyum Arsenür (GaAs):** $n_i = 1.8 \times 10^{6}\text{ cm}^{-3}$  
>     

## 5. Ekstrinsik Yarıiletkenler (Yüksek Katkılama Yaklaşımı)

Katkılama düzeyi intrinsik konsantrasyondan çok büyükse ($N_d, N_a \gg n_i$):

- **n-tipi tek yönlü katkılama için:**
    
    $$n \approx N_d \qquad p = \frac{n_i^2}{N_d}$$
- **p-tipi tek yönlü katkılama için:**
    
    $$p \approx N_a \qquad n = \frac{n_i^2}{N_a}$$

## 6. Kompanse Yarıiletkenler için TAM (Kuadratik) Çözüm

Katkılama düzeyi $n_i$'ye çok yakınsa veya iki tip katkı aynı anda varsa yaklaşım formülleri çöker. Kesin çözüm için şu kuadratik formüller uygulanmalıdır:

- **n-tipi baskın ise (**$N_d > N_a$**):**
    
    $$n = \frac{N_d - N_a}{2} + \sqrt{\left(\frac{N_d - N_a}{2}\right)^2 + n_i^2} \qquad p = \frac{n_i^2}{n}$$
- **p-tipi baskın ise (**$N_a > N_d$**):**
    
    $$p = \frac{N_a - N_d}{2} + \sqrt{\left(\frac{N_a - N_d}{2}\right)^2 + n_i^2} \qquad n = \frac{n_i^2}{p}$$
    
    _(CH1 Q7 sorusunun tam ve hatasız çözümü için bu eşitlikler zorunludur.)_
    

> ⚠️ **Kritik Sınav Uyarısı (CH1 Q2-b Çözümü):**
> 
> Sıcaklık $470\text{ K}$ değerine ulaştığında Silisyum için $n_i$ değeri yaklaşık $6 \times 10^{13}\text{ cm}^{-3}$ seviyesine çıkar. Akseptör katkılama düzeyi olan $N_a = 10^{14}\text{ cm}^{-3}$ değeri ile $n_i$ birbirine çok yakın olduğundan, **yaklaşım formülü geçersizdir**. Bu şıkta kesinlikle yukarıdaki kuadratik p-tipi formül kullanılmalıdır.

## 7. Uzaysal Yük Nötrlüğü

Katkılanmış yarıiletkenin elektriksel olarak nötr olma şartı:

$$n + N_a^- = p + N_d^+$$

Tam iyonizasyon varsayımıyla ($N_a^- = N_a$, $N_d^+ = N_d$):

$$n + N_a = p + N_d$$

_(CH1 Q9 sorusunda verilen_ $n$ _ve_ $N_a$ _değerlerinden_ $N_d$ _katkılama miktarını bulmak için bu eşitlik kullanılır.)_

## 8. Fermi Seviyesi ve İntrinsik Seviye İlişkisi (Fermi Seviyesi Konumu)

İntrinsik Fermi seviyesinin konumu (efektif kütle farkından dolayı tam orta noktadan küçük bir kayma gösterir):

$$E_i = \frac{1}{2}(E_c + E_v) + \frac{3}{4}kT\ln\left(\frac{m_h^*}{m_e^*}\right)$$

Taşıyıcı konsantrasyonuna bağlı olarak Fermi seviyesinin konumu:

- **n-tipi için:**
    
    $$E_c - E_F = kT\ln\left(\frac{N_c}{N_d}\right) \qquad E_F - E_i = kT\ln\left(\frac{n}{n_i}\right)$$
- **p-tipi için:**
    
    $$E_F - E_v = kT\ln\left(\frac{N_v}{N_a}\right) \qquad E_i - E_F = kT\ln\left(\frac{p}{n_i}\right)$$
    
    _(CH1 Q3 ve Q9 sorularının çözümünde bu ilişkiler kullanılır.)_
    

## 9. Boltzmann Yaklaşımı Geçerlilik Sınırı

Yarıiletkenin dejenere olmaması ve Boltzmann istatistiğinin uygulanabilmesi için Fermi seviyesi ile bant kenarları arasındaki fark en az $3kT$ olmalıdır:

$$|E_F - E_{c,v}| > 3kT \implies N_{a,d} < N_{c,v} e^{-3} \approx 0.05 \cdot N_{c,v}$$

## 10. Boltzmann Sınırı ve Akseptör İyonizasyon Enerjisi (CH1 Q10 Çözümü)

Boron katkılı p-tipi silisyumda Boltzmann yaklaşımının geçerlilik sınırında ($E_F - E_a = 3kT$):

$$E_F - E_v = (E_a - E_v) - 3kT$$

Sınır durumundaki maksimum katkılama limitini ($N_{a,\max}$) bulmak için spin dejenerasyon faktörü ($g_a = 4$) hesaba katılırsa:

$$N_{a,\max} = \frac{N_v}{g_a} e^{-(E_a - E_v)/kT} e^{-3}$$

Si içinde boron için $E_a - E_v = 0.045\text{ eV}$ ve $T = 300\text{ K}$ ($N_v = 1.04 \times 10^{19}\text{ cm}^{-3}$) değerleriyle hesaplandığında:

$$N_{a,\max} \approx 3.2 \times 10^{17}\text{ cm}^{-3}$$

## 11. Yüksek Sıcaklıkta Taşıyıcı Katkı Oranı Sınırı ve Sıcaklık Bağımlılığı (CH1 Q8 Çözümü)

Yüksek sıcaklık işletiminde intrinsik taşıyıcıların toplam elektron konsantrasyonuna katkısının en fazla $\%5$ olması isteniyorsa ($n_i(T) \leq 0.05 \cdot N_d$):

$$N_{d,\min} = 20 \cdot n_i(T)$$

Burada $n_i(T)$ değeri hedef sıcaklıkta ($T = 550\text{ K}$) oranlama yoluyla hesaplanır:

$$n_i(T) \approx n_i(300\text{ K}) \cdot \left(\frac{T}{300}\right)^{3/2} \cdot \exp\left[-\frac{E_g}{2k} \left(\frac{1}{T} - \frac{1}{300}\right)\right]$$

_(Burada_ $k = 8.617 \times 10^{-5}\text{ eV/K}$ _kullanılır.)_































---




# 🟢 CH2 – Carrier Transport and Recombination (Taşıyıcı İletimi ve Rekombinasyon)

## 12. Saçılma ve Mobilite İlişkisi

Ortalama serbest zaman ($\tau_m$):

$$\tau_m = \frac{m^* \mu}{q}$$

Ortalama serbest yol ($l_m$):

$$l_m = v_{th} \cdot \tau_m$$

Yarıiletken içindeki termal hız ($v_{th}$):

$$\frac{1}{2} m^* v_{th}^2 = \frac{3}{2} kT \implies v_{th} = \sqrt{\frac{3kT}{m^*}} \approx 10^7\text{ cm/s}$$

> **💡 Matthiessen Kuralı (Farklı Saçılma Mekanizmaları Bir Aradayken - CH2 Q7 Çözümü):**
> 
> Örgü (fonon) saçılması ($\mu_L$) ve iyonize safsızlık saçılması ($\mu_I$) birlikte etkili olduğunda:
> 
> $$\frac{1}{\mu_{\text{toplam}}} = \frac{1}{\mu_L} + \frac{1}{\mu_I} \implies \mu_I = \frac{\mu_{\text{toplam}} \cdot \mu_L}{\mu_L - \mu_{\text{toplam}}}$$

## 13. Drift (Sürüklenim) Akımı, İletkenlik ve Özdirenç

Elektrik alan altında taşıyıcıların sürüklenme hızı ($v_d$):

$$v_d = \mu \mathcal{E}$$

Sürüklenim akım yoğunluğu ($J_{drift}$):

$$J_{drift} = q(n\mu_n + p\mu_p)\mathcal{E} = \sigma \mathcal{E}$$

İletkenlik ($\sigma$) ve özdirenç ($\rho$):

$$\sigma = q(n\mu_n + p\mu_p) \qquad \rho = \frac{1}{\sigma}$$

Direnç ($R$):

$$R = \rho \frac{L}{A}$$

## 14. Sürüklenme Hızı Hesaplaması (CH2 Q6 Çözümü)

Belli bir akım ($I$) ve kesit alanı ($A$) altında taşıyıcıların net hızı:

$$v_d = \frac{J}{q n} = \frac{I}{q \cdot n \cdot A}$$

## 15. Hall Etkisi (CH2 Q3 Çözümü)

Malzemenin tipini ve çoğunluk taşıyıcı konsantrasyonunu belirlemek için:

$$R_H = -\frac{1}{q n} \quad (\text{n-tipi için}) \qquad R_H = \frac{1}{q p} \quad (\text{p-tipi için})$$

Hall voltajı ($V_H$):

$$V_H = \frac{R_H I B_z}{W}$$

_(Burada_ $W$ _numunenin kalınlığı,_ $B_z$ _uygulanan manyetik alandır.)_

## 16. Difüzyon Akımı

Konsantrasyon gradyanından dolayı oluşan akım yoğunluğu:

$$J_n^{diff} = q D_n \frac{dn}{dx} \qquad J_p^{diff} = -q D_p \frac{dp}{dx}$$

Doğrusal gradyanlar için ($\Delta n / \Delta x$ - CH2 Q4 Çözümü):

$$J_n = q D_n \frac{\Delta n}{\Delta x}$$

## 17. Einstein Bağıntısı ve Difüzyon Katsayısı (CH2 Q5 ve Q12 Çözümü)

Mobilite ve difüzyon katsayısı arasındaki termal denge ilişkisi:

$$\frac{D_n}{\mu_n} = \frac{D_p}{\mu_p} = \frac{kT}{q} = V_t \approx 0.0259\text{ V}$$$$D = \mu \frac{kT}{q} = \mu V_t$$

## 18. Sadeleştirilmiş İletkenlik Formülleri (CH2 Q8 ve Q9 Sınav Kısayolları)

Katkılanmış yarıiletkenlerde azınlık taşıyıcıların iletkenliğe etkisi ihmal edilebilir düzeydedir:

$$\sigma \approx q n \mu_n \quad (\text{n-tipi için})$$$$\sigma \approx q p \mu_p \quad (\text{p-tipi için})$$

## 19. İletkenlik Değişimi ile Fermi Seviyesi Kayması (CH2 Q9 Çözümü)

Katkılama sonucunda özdirenç düşer, iletkenlik artar. İletkenlik artış katsayısı $k$ ise ($\sigma_{doped} = k \cdot \sigma_{intrinsic}$):

$$\sigma_{intrinsic} = q n_i (\mu_n + \mu_p)$$$$\sigma_{doped} \approx q n \mu_n \quad (\text{n-tipi katkılama için})$$

Buradan elde edilen yeni elektron konsantrasyonu $n$ kullanılarak Fermi seviyesi kayması bulunur:

$$E_F - E_i = kT \ln\left(\frac{n}{n_i}\right)$$

## 20. Quasi-Fermi Seviyeleri (CH2 Q10 Çözümü)

Denge dışı enjeksiyon durumunda ($\Delta n = \Delta p$) elektron ve delikler için ayrı ayrı tanımlanan yalancı Fermi seviyeleri:

$$n = n_i e^{(E_{Fn} - E_i)/kT} \qquad p = n_i e^{(E_i - E_{Fp})/kT}$$$$E_{Fn} - E_{Fp} = kT \ln\left(\frac{n \cdot p}{n_i^2}\right)$$

Katkısız (intrinsik) malzemede enjeksiyon yapıldığında:

$$n = n_i + \Delta n \qquad p = n_i + \Delta p \implies E_{Fn} - E_{Fp} = 2kT\ln\left(\frac{n_i + \Delta n}{n_i}\right)$$

## 21. Işık Soğurulması ve Minimum Kalınlık (CH2 Q11 Çözümü)

Beer-Lambert Kanunu uyarınca ışık şiddetinin malzeme derinliğine göre azalması:

$$I(x) = I_0 e^{-\alpha x}$$

Gelen ışığın $\%90$'ını absorbe etmek için gereken minimum kalınlık ($d$):

$$1 - e^{-\alpha d} = 0.90 \implies e^{-\alpha d} = 0.10 \implies d = \frac{\ln(10)}{\alpha} \approx \frac{2.3}{\alpha}$$

## 22. Azınlık Taşıyıcı Difüzyon Uzunluğu (CH2 Q12 ve CH4 Çözümleri)

Azınlık taşıyıcıların rekombine olmadan önce katettikleri ortalama mesafe:

$$L = \sqrt{D \tau} \implies L_n = \sqrt{D_n \tau_n} \qquad L_p = \sqrt{D_p \tau_p}$$

## 23. Azınlık Taşıyıcı Difüzyon Denklemi ve Genel Çözümü (CH2 Q13 Çözümü)

Uzaysal olarak kararlı haldeki azınlık taşıyıcı dağılımı:

$$\frac{d^2(\Delta n)}{dx^2} - \frac{\Delta n}{L_n^2} = 0$$

Genel Çözüm Yapısı:

$$\Delta n(x) = K_1 e^{-x/L_n} + K_2 e^{x/L_n}$$

_Sınır koşulları (_$\Delta n(0)$ _ve_ $\Delta n(L)$_) uygulanarak_ $K_1$ _ve_ $K_2$ _katsayıları bulunur._

- $L \ll L_n$ ise dağılım tamamen doğrusala yaklaşır.
    


















---




# 🟠 CH3 – pn Junction Electrostatics (pn Eklemi Elektrostatniği)

## 24. Kontak Potansiyeli (Built-in Voltage)

Sıfır dış bias altında p-n ekleminde kendiliğinden oluşan potansiyel bariyeri:

$$V_{bi} \quad (\text{veya } \Psi_0) = V_t \ln\left(\frac{N_a N_d}{n_i^2}\right)$$

_(CH3 Q1'in çözümünde doğrudan kullanılır.)_

## 25. Depresyon (Depletion) Bölgesi Toplam Genişliği (CH3 Tüm Sorular)

Uygulanan dış gerilim ($V_A$) altındaki toplam fakirleşme genişliği:

$$X_d = \sqrt{\frac{2 \epsilon_s}{q} \left( \frac{N_a + N_d}{N_a N_d} \right) (V_{bi} - V_A)}$$

- **Sıfır Polarma (Zero Bias):** $V_A = 0$  
    
- **İleri Polarma (Forward Bias):** $V_A > 0$  
    
- **Ters Polarma (Reverse Bias):** $V_A = -V_R \implies$ Terim $(V_{bi} + V_R)$ haline gelir.
    

## 26. Nötr Bölgelere Nüfuz Derinlikleri

Toplam fakirleşme genişliğinin p ve n bölgelerindeki dağılımı:

$$N_a x_p = N_d x_n \implies X_d = x_n + x_p$$$$x_n = X_d \left( \frac{N_a}{N_a + N_d} \right) \qquad x_p = X_d \left( \frac{N_d}{N_a + N_d} \right)$$

## 27. Maksimum Elektrik Alan (CH3 Q2-Q3 Çözümü)

Eklemin tam birleşme noktasında ($x = 0$) oluşan en yüksek elektrik alan gücü:

$$|E_{\max}| = \frac{q N_d x_n}{\epsilon_s} = \frac{q N_a x_p}{\epsilon_s} = \frac{2(V_{bi} - V_A)}{X_d}$$

## 28. Depresyon Bölgesi Birim Yükü

Eklem alanının p veya n tarafındaki net iyon yükü (büyüklük olarak):

$$Q = q \cdot A \cdot N_d \cdot x_n = q \cdot A \cdot N_a \cdot x_p$$

## 29. Eklem (Junction) Kapasitesi (CH3 Q4 Çözümü)

Birim alan başına eklem kapasitesi ($C_j'$):

$$C_j' = \frac{\epsilon_s}{X_d} = \sqrt{\frac{q \epsilon_s N_a N_d}{2(N_a + N_d)(V_{bi} - V_A)}}$$

Toplam Kapasite:

$$C_j = A \cdot C_j' = A \frac{\epsilon_s}{X_d}$$

## 30. Tek Taraflı Abrupt Eklemler (One-Sided Junctions)

Katkılama oranlarının bir tarafta aşırı yüksek olması durumunda ($p^+-n$ eklemi için $N_a \gg N_d$):

$$x_n \approx X_d \qquad x_p \approx 0$$$$X_d \approx \sqrt{\frac{2\epsilon_s(V_{bi} - V_A)}{q N_d}} \qquad C_j' \approx \sqrt{\frac{q \epsilon_s N_d}{2(V_{bi} - V_A)}}$$
---



































---




# 🔴 CH4 – pn Junction Under Forward/Reverse Bias (Bias Altında pn Eklemi)

## 31. İdeal Diyot (Shockley) Akım Denklemi

Diyottan geçen toplam akım ve akım yoğunluğu ilişkisi:

$$I = I_s \left( e^{V_A/V_t} - 1 \right) \qquad J = J_s \left( e^{V_A/V_t} - 1 \right)$$$$I = J \cdot A$$

## 32. Ters Doyum Akımı (CH4 Q1 Çözümü)

Azınlık taşıyıcı difüzyonu nedeniyle oluşan taban sızıntı akımı:

$$I_s = A \cdot J_s = A \cdot q n_i^2 \left( \frac{D_p}{L_p N_d} + \frac{D_n}{L_n N_a} \right)$$

## 33. Enjeksiyon Verimi (CH4 Q3 Çözümü)

İleri yönde polarılmış eklemde, elektron enjeksiyon akımının toplam akıma oranı:

$$\gamma_{inj} = \frac{J_n}{J_{\text{toplam}}} = \frac{J_n}{J_n + J_p} = \frac{\frac{D_n}{L_n N_a}}{\frac{D_n}{L_n N_a} + \frac{D_p}{L_p N_d}}$$

## 34. Nötr Bölgede Biriken Azınlık Taşıyıcı Yükü (CH4 Q7 Çözümü)

İleri bias altında nötr n-bölgesinde biriken fazla deliklerin birim alan başına toplam yükü:

$$Q_p = q \cdot p_{n0} \cdot L_p \left( e^{V_A/V_t} - 1 \right) = J_p \cdot \tau_p$$

## 35. Diferansiyel Admitans ve Difüzyon Kapasitesi (CH4 Q8 Çözümü)

Diyodun küçük işaret admitansı ($Y$):

$$Y = g_d + j\omega (C_j + C_{diff})$$

- Diyot İletkenliği: $g_d = \frac{I}{V_t}$  
    
- Difüzyon Kapasitesi: $C_{diff} = K_f \left( \frac{q}{kT} \right) I \tau_p = K_f \frac{I \tau_p}{V_t}$  
    

> **Tasarım Faktörü (**$K_f$**):**
> 
> - Uzun tabanlı diyotlar (Long Base) için: $K_f = 1/2$  
>     
> - Dar tabanlı diyotlar (Narrow Base) için: $K_f = 2/3$  
>     

## 36. Optik Dedektör Fotoakımı (CH4 Q5 Çözümü)

Depresyon bölgesinde ve bu bölgeye difüzyon mesafesinde üretilen tüm taşıyıcıların toplandığı toplam fotoakım ($I_L$):

$$I_L = q \cdot A \cdot G_L \cdot (X_d + L_n + L_p)$$

## 37. Ters Polarma Jenerasyon (Üretim) Akımı (CH4 Q6 Çözümü)

Ters bias altında depresyon bölgesindeki termal jenerasyon nedeniyle oluşan akım yoğunluğu:

$$J_{gen} = \frac{q n_i X_d}{\tau_g}$$

_(Soru_ $\tau_g = \tau_n = \tau_p$ _olarak verirse paydadaki katsayı_ $1$ _alınır.)_

## 38. LED Foton Üretim Hızı ve Optik Güç (CH4 Q4 Çözümü)

Enjekte edilen azınlık taşıyıcılarının foton üretme kapasitesi:

- Elektron enjeksiyon akımı: $I_n = \gamma_{inj} \cdot I_{\text{toplam}}$  
    
- Foton Üretim Hızı ($R_{\text{photon}}$):
    
    $$R_{\text{photon}} = \frac{I_n}{q} \quad (\text{s}^{-1})$$
- LED Optik Gücü ($P_{\text{opt}}$):
    
    $$P_{\text{opt}} = R_{\text{photon}} \cdot E_g \cdot (1.6 \times 10^{-19}\text{ J/eV}) \quad (\text{Watt})$$

### ⚙️ Hayati Fiziksel Sabitler

| Sembol | Tanım | Değer |
| :---: | :--- | :--- |
| $q$ | Elektron Yükü | $1.6 \times 10^{-19}\text{ C}$ |
| $k$ | Boltzmann Sabiti | $1.38 \times 10^{-23}\text{ J/K}$ veya $8.617 \times 10^{-5}\text{ eV/K}$ |
| $\epsilon_0$ | Boşluğun Permittivitesi | $8.854 \times 10^{-14}\text{ F/cm}$ |
| $\epsilon_s \text{ (Si)}$ | Silisyumun Dielektrik Sabiti | $11.7 \cdot \epsilon_0 \approx 1.036 \times 10^{-12}\text{ F/cm}$ |
| $\epsilon_s \text{ (GaAs)}$ | GaAs Dielektrik Sabiti | $13.1 \cdot \epsilon_0 \approx 1.16 \times 10^{-12}\text{ F/cm}$ |
| $V_t$ | Termal Voltaj ($300\text{ K}$) | $0.0259\text{ V}$ (Pratik hesaplar için $0.026\text{ V}$) |

---

### 📐 Birim Dönüşüm Referans Tablosu

> **Sınav İpucu:** Sınav esnasında birim hatası yapmamak için soruda verilen her uzunluğu, alanı ve hacmi işlem yapmadan önce hemen santimetre ($\text{cm}$) tabanına çevir:

| Birim Türü                       | Dönüşüm Eşitliği                         |
| :------------------------------- | :--------------------------------------- |
| Metre ($\text{m}$)               | $1\text{ m} = 100\text{ cm}$             |
| Milimetre ($\text{mm}$)          | $1\text{ mm} = 0.1\text{ cm}$            |
| Mikrometre ($\mu\text{m}$)       | $1\ \mu\text{m} = 10^{-4}\text{ cm}$     |
| Nanometre ($\text{nm}$)          | $1\text{ nm} = 10^{-7}\text{ cm}$        |
| Angstrom ($\text{Å}$)            | $1 \times 10^{-8} \text{ cm}$            |
| Pikometre ($\text{pm}$)          | $1\text{ pm} = 10^{-10}\text{ cm}$       |
| Milimetrekare ($\text{mm}^2$)    | $1\text{ mm}^2 = 10^{-2}\text{ cm}^2$    |
| Mikrometrekare ($\mu\text{m}^2$) | $1\ \mu\text{m}^2 = 10^{-8}\text{ cm}^2$ |
