import os
file_path = r"c:\Users\HP\DEV\RunDoc\apps\worker\app\main.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("SupabaseService", "FirebaseService")
content = content.replace("supabase_service", "firebase_service")
content = content.replace("url=settings.supabase_url", "service_account_path=settings.firebase_service_account_path")
content = content.replace("service_key=settings.supabase_service_key", "storage_bucket=settings.firebase_storage_bucket")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated main.py")
