"""
Pandoc Orchestrator — Firebase Service
Dosya indirme/yükleme, durum yönetimi ve log yazma işlemleri.
"""

import logging
import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class FirebaseService:
    """
    Firebase Firestore ve Cloud Storage ile etkileşim katmanı.
    Worker'ın dosya indirme, çıktı yükleme ve durum güncelleme işlemlerini yönetir.
    """

    def __init__(self, service_account_path: str, storage_bucket: str):
        self.service_account_path = service_account_path
        self.storage_bucket = storage_bucket
        self._db = None
        self._bucket = None
        self._initialized = False

    def _initialize(self):
        """Lazy-init Firebase app."""
        if not self._initialized:
            try:
                import firebase_admin
                from firebase_admin import credentials, firestore, storage

                # Check if app is already initialized
                if not firebase_admin._apps:
                    if not os.path.exists(self.service_account_path):
                        logger.warning(f"Firebase Service Account dosyası bulunamadı: {self.service_account_path}. Veritabanı işlemleri yapılamayacak.")
                        self._initialized = True # Mark initialized to avoid repeated errors
                        return
                        
                    cred = credentials.Certificate(self.service_account_path)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': self.storage_bucket
                    })
                
                self._db = firestore.client()
                self._bucket = storage.bucket()
                self._initialized = True
            except ImportError:
                logger.error("firebase-admin paketi kurulu değil: pip install firebase-admin")
                raise
            except Exception as e:
                logger.error(f"Firebase başlatma hatası: {e}")
                raise

    @property
    def db(self):
        self._initialize()
        return self._db

    @property
    def bucket(self):
        self._initialize()
        return self._bucket

    # =============================================
    # STORAGE İŞLEMLERİ
    # =============================================

    def download_file(self, storage_path: str, local_path: str) -> bool:
        """Firebase Storage'dan dosya indirir."""
        if not self.bucket: return False
        try:
            blob = self.bucket.blob(storage_path)
            blob.download_to_filename(local_path)
            logger.info(f"Dosya indirildi: {storage_path} → {local_path}")
            return True
        except Exception as e:
            logger.error(f"Dosya indirme hatası: {e}")
            return False

    def upload_file(
        self, storage_path: str, local_path: str, content_type: Optional[str] = None
    ) -> Optional[str]:
        """Dosyayı Firebase Storage'a yükler."""
        if not self.bucket: return None
        try:
            blob = self.bucket.blob(storage_path)
            if content_type:
                blob.content_type = content_type
            blob.upload_from_filename(local_path)

            logger.info(f"Dosya yüklendi: {local_path} → {storage_path}")
            return storage_path

        except Exception as e:
            logger.error(f"Dosya yükleme hatası: {e}")
            return None

    def get_public_url(self, storage_path: str) -> str:
        """Dosyanın public URL'sini döndürür."""
        if not self.bucket: return ""
        blob = self.bucket.blob(storage_path)
        # Firebase Storage URL format (eğer dosyayı public yaptıysanız)
        # return blob.public_url
        
        # Eğer imzalı URL istenirse:
        try:
            return blob.generate_signed_url(expiration=3600)
        except Exception as e:
            logger.error(f"URL oluşturma hatası: {e}")
            return ""

    def create_signed_url(self, storage_path: str, expires_in: int = 3600) -> Optional[str]:
        """İmzalı geçici indirme URL'si oluşturur."""
        if not self.bucket: return None
        try:
            blob = self.bucket.blob(storage_path)
            return blob.generate_signed_url(expiration=expires_in)
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
        if not self.db: return str(uuid.uuid4()) # Mock ID for testing
        try:
            data = {
                "project_id": project_id,
                "user_id": user_id,
                "input_format": input_format,
                "output_format": output_format,
                "engine_used": engine,
                "status": "pending",
                "created_at": firestore.SERVER_TIMESTAMP
            }

            _, doc_ref = self.db.collection("conversion_logs").add(data)
            logger.info(f"Dönüşüm log oluşturuldu: {doc_ref.id}")
            return doc_ref.id

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
        if not self.db: return True
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
                from firebase_admin import firestore
                data["completed_at"] = firestore.SERVER_TIMESTAMP

            doc_ref = self.db.collection("conversion_logs").document(log_id)
            doc_ref.update(data)
            logger.info(f"Log güncellendi: {log_id} → {status}")
            return True

        except Exception as e:
            logger.error(f"Log güncelleme hatası: {e}")
            return False

    def get_conversion_log(self, log_id: str) -> Optional[Dict]:
        """Belirli bir dönüşüm logunu getirir."""
        if not self.db: return None
        try:
            doc = self.db.collection("conversion_logs").document(log_id).get()
            if doc.exists:
                data = doc.to_dict()
                data["id"] = doc.id
                return data
            return None
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
        if not self.db: return str(uuid.uuid4())
        try:
            from firebase_admin import firestore
            data = {
                "project_id": project_id,
                "file_name": file_name,
                "storage_path": storage_path,
                "file_type": file_type,
                "created_at": firestore.SERVER_TIMESTAMP
            }
            if mime_type:
                data["mime_type"] = mime_type
            if file_size_bytes:
                data["file_size_bytes"] = file_size_bytes
            if metadata:
                data["metadata"] = metadata

            _, doc_ref = self.db.collection("documents").add(data)
            logger.info(f"Doküman kaydedildi: {doc_ref.id} ({file_name})")
            return doc_ref.id

        except Exception as e:
            logger.error(f"Doküman kaydetme hatası: {e}")
            return None
