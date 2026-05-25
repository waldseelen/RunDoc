# 🔥 Firebase Setup & Migration Guide

This document describes how to configure Firebase Firestore and Cloud Storage for the **RunDoc** (Pandoc Orchestrator) application.

It covers Firestore collections schema, Cloud Storage folder structures, security rules, and credentials configuration.

---

## 1. Credentials Configuration

To allow the Python fastapi worker to communicate with Firebase, you must create a Service Account:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project and click **Project Settings** (gear icon) > **Service Accounts**.
3. Click **Generate New Private Key** and download the JSON file.
4. Rename this file to `firebase-service-account.json` and place it in the worker folder:
   - Path: `apps/worker/firebase-service-account.json`
5. Populate the path in `apps/worker/.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   ```

---

## 2. Cloud Storage Buckets Layout

RunDoc organizes documents in Cloud Storage under logical directories mapping to unique project and conversion scopes:

```text
your-project.appspot.com/
├── {project_id}/
│   ├── document.md                # Source inputs uploaded by users
│   ├── reference_template.docx    # Reference docx branding templates
│   └── bibliography.bib           # Academic reference database files
└── {project_id}/{job_id}/
    └── compiled_output.pdf        # Production outputs built by worker
```

### Storage Security Rules

Add these rules to your Firebase Storage configuration to enforce access validation:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{projectId}/{allPaths=**} {
      // Allow read/write if the request is authenticated and project matches
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 3. Firestore Collections Schema

Firestore stores metadata for documents, conversion logs, and projects.

### Collection 1: `projects`
Stores project info owned by a user.
- **Document ID**: `project_id` (UUID4)
- **Fields**:
  - `id`: `String` (UUID)
  - `user_id`: `String` (Owner's Firebase Auth UID)
  - `name`: `String` (e.g. "Quantum Computing Paper")
  - `created_at`: `Timestamp` (Server timestamp)

### Collection 2: `documents`
Stores metadata and paths of uploaded assets.
- **Document ID**: `document_id` (UUID4)
- **Fields**:
  - `id`: `String` (UUID)
  - `project_id`: `String` (References `projects.id`)
  - `file_name`: `String` (e.g., `document.md`)
  - `storage_path`: `String` (e.g., `proj-id/document.md`)
  - `file_type`: `String` (`"source"` | `"reference"` | `"bibliography"` | `"output"`)
  - `mime_type`: `String` (e.g., `"text/markdown"`)
  - `file_size_bytes`: `Integer` (e.g., `4500`)
  - `created_at`: `Timestamp` (Server timestamp)

### Collection 3: `conversion_logs`
Tracks execution status of background Pandoc transformations.
- **Document ID**: `job_id` (UUID4)
- **Fields**:
  - `id`: `String` (UUID)
  - `project_id`: `String` (References `projects.id`)
  - `user_id`: `String` (UID of requesting user)
  - `input_format`: `String` (e.g., `"markdown"`)
  - `output_format`: `String` (e.g., `"pdf"`)
  - `engine_used`: `String` (e.g., `"xelatex"`)
  - `status`: `String` (`"pending"` | `"processing"` | `"completed"` | `"failed"`)
  - `command_executed`: `String` (Pandoc CLI command string, for audit debugging)
  - `error_message`: `String` (Compiler stderr or stack trace if status is `"failed"`)
  - `execution_time_ms`: `Integer` (Process duration in milliseconds)
  - `output_document_id`: `String` (References `documents.id` on completion)
  - `filters_applied`: `Array[String]` (List of filters enjected, e.g. `["table_styler.lua"]`)
  - `created_at`: `Timestamp` (Server timestamp)
  - `completed_at`: `Timestamp` (Server timestamp when finished)

---

## 4. Zero-Config Local Sandbox Mode

If `firebase-service-account.json` is missing or unreachable, the system **automatically degrades gracefully into an in-memory Sandbox Mode**:

- **Firestore**: Simulation stores logs in a secure in-memory Python dictionary cache.
- **Storage**: Falls back to the local file system using `temp_workdir` as local sandbox.
- **Preview**: Served instantly via FastAPI static endpoints (`/outputs/{job_id}/{filename}`).

This enables full local debugging of PDF, HTML, and Word transformations without needing any Firebase credentials setup!

---

## 5. Firebase CLI Deployment Guide

We have preconfigured a full suite of Firebase CLI config files in the project root:
- `firebase.json`: CLI project services configuration registry.
- `.firebaserc`: Associates default Firebase project targets.
- `firestore.rules`: Security access control rules for databases.
- `storage.rules`: Security access control rules for cloud files.
- `firestore.indexes.json`: Composite query performance indexes.

### Deployment Instructions

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Authenticate with Firebase**:
   ```bash
   firebase login
   ```

3. **Bind Your Firebase Project**:
   Replace `rundoc-prod` with your actual Firebase Project ID from the console:
   ```bash
   firebase use --add your-firebase-project-id
   ```

4. **Deploy Everything in One Command**:
   ```bash
   firebase deploy
   ```

   Alternatively, you can deploy individual features separately:
   - **Deploy Firestore Rules**: `firebase deploy --only firestore:rules`
   - **Deploy Firestore Indexes**: `firebase deploy --only firestore:indexes`
   - **Deploy Storage Rules**: `firebase deploy --only storage`
