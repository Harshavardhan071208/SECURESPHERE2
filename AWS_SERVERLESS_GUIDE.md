# SecureSphere Serverless Architecture Guide

Based on your requirement to use **CloudFront** (Frontend) and **Lambda** (ClamAV Scanning), we recommend the **S3 Event-Driven Quarantine Pipeline**.

This architecture solves the "Scan vs Encryption" conflict:
- **Problem**: You cannot scan a file *after* it is encrypted (it looks like random noise).
- **Solution**: Upload **Unencrypted** to a temporary "Quarantine" bucket first.

## Recommended Workflow

1.  **Frontend (Next.js on CloudFront)**
    - User selects file.
    - App requests a **Presigned URL** for the `quarantine-bucket`.
    - App uploads the **Raw File (Unencrypted)** directly to S3 `quarantine-bucket/user-id/file.tmp`.
    - App polls an API for status or waits for WebSocket notification.

2.  **Step 1: Virus Scanning (ClamAV Lambda)**
    - **Trigger**: S3 Object Created (in Quarantine Bucket).
    - **Action**:
        - Lambda downloads the file.
        - Runs ClamAV scan.
    - **Outcome**:
        - **Infected**: Delete file, Log Alert, Notify User (SNS/Email).
        - **Clean**: Trigger Step 2 (Encryption).

3.  **Step 2: Encryption & Final Storage (Security Lambda)**
    - **Trigger**: "Scan Clean" event (e.g., from Step Functions or S3 Tag change).
    - **Action**:
        - Lambda reads the clean file from Quarantine.
        - Generates/Retrieves Encryption Keys (AES-256-GCM).
        - **Encrypts the file content**.
        - Writes the **Encrypted File** to the `production-bucket/user-id/file.enc`.
        - **Deletes** the file from `quarantine-bucket` (Secure Wipe).

---

## Why this is "Better" than the Next.js API Route?

1.  **Scalability**: Next.js API routes (Lambdas) have a 6MB payload limit on Vercel/AWS API Gateway. Uploading large files directly to S3 (via Presigned URLs) bypasses this limit.
2.  **Performance**: Scanning and Encrypting large files is CPU intensive. Dedicated Lambdas handle this better than a web server.
3.  **Cost**: Storage in a quarantine bucket (Lifecycle Policy: Delete after 24h) is cheaper than processing bytes through a web proxy.

## Implementation Checklist

- [ ] **S3 Buckets**:
    - `securesphere-quarantine` (Private, Auto-Delete after 24h)
    - `securesphere-vault` (Private, Versioning Enabled)
- [ ] **Lambdas**:
    - `clamav-scanner`: Uses a ClamAV Layer (e.g., `serverless-clamav-task`).
    - `file-encryptor`: Uses Node.js `crypto` module.
- [ ] **API**:
    - `GET /api/presigned-url` (Generates upload URL).
    - `GET /api/file-status` (Checks if file is ready in Vault).

## Regarding Current Code
The code currently in `app/api/secure-upload/route.ts` is a **Synchronous Monolith** pattern. It works great for prototypes, EC2, or Containers (Fargate). It **will struggle** in a pure Lambda environment due to timeout limits and the requirement for `clamd` binaries.

**Recommendation**: Transition to the Serverless Pipeline described above for Production.
