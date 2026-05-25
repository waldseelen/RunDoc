-- =============================================
-- Pandoc Orchestrator — Seed Data
-- Test verisi ve varsayılan yapılandırmalar
-- =============================================

-- NOT: Seed data ancak Supabase Auth'ta bir test kullanıcısı oluşturulduktan sonra çalışır.
-- Test kullanıcısının UUID'sini aşağıda YOUR_TEST_USER_UUID yerine yazın.

-- Örnek proje (aktifleştirmek için aşağıdaki satırların yorumunu kaldırın)
-- INSERT INTO public.projects (user_id, name, description, default_output_format, default_engine)
-- VALUES
--     ('YOUR_TEST_USER_UUID', 'Akademik Makale', 'Örnek akademik makale projesi', 'pdf', 'xelatex'),
--     ('YOUR_TEST_USER_UUID', 'Teknik Dokümantasyon', 'API dokümanları', 'html', 'weasyprint');
