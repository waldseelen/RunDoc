"""
Pandoc Orchestrator — Supabase Service
Dosya indirme/yükleme, durum yönetimi ve log yazma işlemleri.
"""

import logging
import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class SupabaseService:
    """
    Supabase Storage ve PostgreSQL ile etkileşim katmanı.
    Worker'ın dosya indirme, çıktı yükleme ve durum güncelleme işlemlerini yönetir.
    """

    def __init__(self, url: str, service_key: str):
        self.url = url
        self.service_key = service_key
        self._client = None

    @property
    def client(self):
        """Lazy-init Supabase client."""
        if self._client is None:
            try:
                from supabase import create_client, Client
                self._client: Client = create_client(self.url, self.service_key)
            except ImportError:
                logger.error("supabase-py paketi kurulu değil: pip install supabase")
                raise
            except Exception as e:
                logger.error(f"Supabase bağlantı hatası: {e}")
                raise
        return self._client

    # =============================================
    # STORAGE İŞLEMLERİ
    # =============================================

    def download_file(self, bucket: str, storage_path: str, local_path: str) -> bool:
        """Supabase Storage'dan dosya indirir."""
        try:
            response = self.client.storage.from_(bucket).download(storage_path)
            with open(local_path, "wb") as f:
                f.write(response)
            logger.info(f"Dosya indirildi: {bucket}/{storage_path} → {local_path}")
            return True
        except Exception as e:
            logger.error(f"Dosya indirme hatası: {e}")
            return False

    def upload_file(
        self, bucket: str, storage_path: str, local_path: str, content_type: Optional[str] = None
    ) -> Optional[str]:
        """Dosyayı Supabase Storage'a yükler."""
        try:
            with open(local_path, "rb") as f:
                file_data = f.read()

            options = {}
            if content_type:
                options["content-type"] = content_type

            self.client.storage.from_(bucket).upload(
                path=storage_path,
                file=file_data,
                file_options=options
            )

            logger.info(f"Dosya yüklendi: {local_path} → {bucket}/{storage_path}")
            return storage_path

        except Exception as e:
            logger.error(f"Dosya yükleme hatası: {e}")
            return None

    def get_public_url(self, bucket: str, storage_path: str) -> str:
        """Dosyanın public URL'sini döndürür."""
        return self.client.storage.from_(bucket).get_public_url(storage_path)

    def create_signed_url(self, bucket: str, storage_path: str, expires_in: int = 3600) -> Optional[str]:
        """İmzalı geçici indirme URL'si oluşturur."""
        try:
            response = self.client.storage.from_(bucket).create_signed_url(
                storage_path, expires_in
            )
            return response.get("signedURL")
        except Exception as e:
            logger.error(f"İmzalı URL oluşturma hatası: {e}")
            return None

    # =============================================
    # CONVERSION LOG İŞLEMLERİ
    # =============================================

    def create_conversion_log(
        self,
        project_id: str,
        user_id: str,
        input_format: str,
        output_format: str,
        engine: Optional[str] = None
    ) -> Optional[str]:
        """Yeni bir dönüşüm log kaydı oluşturur (status: pending)."""
        try:
            data = {
                "project_id": project_id,
                "user_id": user_id,
                "input_format": input_format,
                "output_format": output_format,
                "engine_used": engine,
                "status": "pending"
            }

            response = self.client.table("conversion_logs").insert(data).execute()

            if response.data:
                log_id = response.data[0]["id"]
                logger.info(f"Dönüşüm log oluşturuldu: {log_id}")
                return log_id
            return None

        except Exception as e:
            logger.error(f"Log oluşturma hatası: {e}")
            return None

    def update_conversion_status(
        self,
        log_id: str,
        status: str,
        command_executed: Optional[str] = None,
        error_message: Optional[str] = None,
        execution_time_ms: Optional[int] = None,
        output_document_id: Optional[str] = None,
        filters_applied: Optional[list] = None
    ) -> bool:
        """Dönüşüm log durumunu günceller."""
        try:
            data: Dict[str, Any] = {"status": status}

            if command_executed:
                data["command_executed"] = command_executed
            if error_message:
                data["error_message"] = error_message
            if execution_time_ms is not None:
                data["execution_time_ms"] = execution_time_ms
            if output_document_id:
                data["output_document_id"] = output_document_id
            if filters_applied:
                data["filters_applied"] = filters_applied
            if status in ("completed", "failed"):
                data["completed_at"] = datetime.now(timezone.utc).isoformat()

            self.client.table("conversion_logs").update(data).eq("id", log_id).execute()
            logger.info(f"Log güncellendi: {log_id} → {status}")
            return True

        except Exception as e:
            logger.error(f"Log güncelleme hatası: {e}")
            return False

    def get_conversion_log(self, log_id: str) -> Optional[Dict]:
        """Belirli bir dönüşüm logunu getirir."""
        try:
            response = (
                self.client.table("conversion_logs")
                .select("*")
                .eq("id", log_id)
                .single()
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Log getirme hatası: {e}")
            return None

    # =============================================
    # DOKÜMAN İŞLEMLERİ
    # =============================================

    def register_document(
        self,
        project_id: str,
        file_name: str,
        storage_path: str,
        file_type: str,
        mime_type: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> Optional[str]:
        """Doküman kaydı oluşturur."""
        try:
            data = {
                "project_id": project_id,
                "file_name": file_name,
                "storage_path": storage_path,
                "file_type": file_type,
            }
            if mime_type:
                data["mime_type"] = mime_type
            if file_size_bytes:
                data["file_size_bytes"] = file_size_bytes
            if metadata:
                data["metadata"] = metadata

            response = self.client.table("documents").insert(data).execute()

            if response.data:
                doc_id = response.data[0]["id"]
                logger.info(f"Doküman kaydedildi: {doc_id} ({file_name})")
                return doc_id
            return None

        except Exception as e:
            logger.error(f"Doküman kaydetme hatası: {e}")
            return None

    def get_project_documents(self, project_id: str, file_type: Optional[str] = None) -> list:
        """Bir projeye ait dokümanları listeler."""
        try:
            query = (
                self.client.table("documents")
                .select("*")
                .eq("project_id", project_id)
            )

            if file_type:
                query = query.eq("file_type", file_type)

            response = query.order("created_at", desc=True).execute()
            return response.data or []

        except Exception as e:
            logger.error(f"Doküman listeleme hatası: {e}")
            return []
