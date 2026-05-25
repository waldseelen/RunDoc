-- =============================================
-- Pandoc Orchestrator — Database Schema
-- Supabase PostgreSQL Migration
-- =============================================

-- Uzun süren işlemler için durum enum tipi
CREATE TYPE conversion_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Dosya tipleri için enum
CREATE TYPE document_type AS ENUM ('source', 'reference', 'bibliography', 'filter', 'output', 'media');

-- =============================================
-- TABLOLAR
-- =============================================

-- Projeler Tablosu
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_output_format TEXT DEFAULT 'pdf',
    default_engine TEXT DEFAULT 'xelatex',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dokümanlar ve Varlıklar Tablosu
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type document_type NOT NULL DEFAULT 'source',
    mime_type TEXT,
    file_size_bytes BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dönüşüm Günlükleri Tablosu
CREATE TABLE public.conversion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status conversion_status DEFAULT 'pending'::conversion_status NOT NULL,

    -- Girdi/Çıktı bilgileri
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    engine_used TEXT,

    -- Dosya referansları
    input_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    output_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

    -- İşlem detayları
    command_executed TEXT,
    pandoc_options JSONB DEFAULT '{}'::jsonb,
    filters_applied TEXT[],
    error_message TEXT,
    execution_time_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Kullanıcı Şablonları (Kaydedilmiş dönüşüm konfigürasyonları)
CREATE TABLE public.user_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- config örneği:
    -- {
    --   "input_format": "markdown",
    --   "output_format": "pdf",
    --   "engine": "xelatex",
    --   "citeproc": true,
    --   "toc": true,
    --   "smart": true,
    --   "filters": ["table_styler.lua"],
    --   "variables": {"geometry": "margin=1in"}
    -- }
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- İNDEKSLER
-- =============================================

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_documents_project_id ON public.documents(project_id);
CREATE INDEX idx_documents_file_type ON public.documents(file_type);
CREATE INDEX idx_conversion_logs_project_id ON public.conversion_logs(project_id);
CREATE INDEX idx_conversion_logs_user_id ON public.conversion_logs(user_id);
CREATE INDEX idx_conversion_logs_status ON public.conversion_logs(status);
CREATE INDEX idx_user_templates_user_id ON public.user_templates(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar yalnızca kendi projelerini görebilir/düzenleyebilir
CREATE POLICY "Users can CRUD own projects"
    ON public.projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar yalnızca kendi projelerine ait dokümanları görebilir
CREATE POLICY "Users can CRUD own documents"
    ON public.documents FOR ALL
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Kullanıcılar yalnızca kendi dönüşüm loglarını görebilir
CREATE POLICY "Users can view own conversion logs"
    ON public.conversion_logs FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Kullanıcılar yalnızca kendi şablonlarını görebilir/düzenleyebilir
CREATE POLICY "Users can CRUD own templates"
    ON public.user_templates FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =============================================
-- UPDATED_AT TETİKLEYİCİSİ
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_projects_updated
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_user_templates_updated
    BEFORE UPDATE ON public.user_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
