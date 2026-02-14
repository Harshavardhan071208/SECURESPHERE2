# SecureSphere Architecture: Hybrid Encryption & File Sharing

## Overview
This document outlines the security architecture for the SecureSphere file sharing platform. The system employs a **Hybrid Encryption Model** combining **AES-128** for data encryption and **RSA-2048** for key management, ensuring secure user-to-user and cross-organization file sharing.

---

## 🔐 Hybrid Encryption Model

The system uses a dual-layer encryption approach:
1.  **AES-128 (Symmetric):** Used to encrypt the actual file content efficiently.
    *   *Algorithm:* AES-128-GCM (Preferred) or AES-128-CBC.
2.  **RSA-2048 (Asymmetric):** Used to encrypt the AES key, ensuring only the intended recipient can decrypt it.

---

## 📌 Data Structure & Fields

The secure payload is divided into 5 categories:

### 1️⃣ Identification Fields (MANDATORY)
*Identifies who is sending and who should receive.*

| Field | Required | Purpose |
| :--- | :---: | :--- |
| `fileId` | ✅ | Unique file reference (UUID) |
| `senderOrgId` | ✅ | Organization of sender |
| `senderUserId` | ✅ | Exact sender user ID |
| `receiverOrgId` | ✅ | Target organization ID |
| `receiverUserId` | ✅ | Exact receiver user ID |

> **Note:** Without `receiverUserId`, the share would be organization-wide, which is less secure.

### 2️⃣ Encryption Fields (MANDATORY)
*Required for AES + RSA hybrid decryption.*

| Field | Required | Purpose |
| :--- | :---: | :--- |
| `encryptedFile` | ✅ | The file content encrypted using AES-128 |
| `encryptedAESKey` | ✅ | The AES key encrypted using the receiver’s RSA public key |
| `iv` | ✅ | Initialization Vector used in AES |
| `authTag` | ✅ (GCM) | Authentication Tag (Required for AES-GCM) |

> *If using AES-128-CBC → no authTag is needed.*

### 3️⃣ Integrity & Authenticity Fields (STRONGLY RECOMMENDED)
*Prevents tampering and verifies sender identity.*

| Field | Purpose |
| :--- | :--- |
| `fileHash` | SHA-256 hash of the original file to verify integrity |
| `digitalSignature` | Hash signed using sender’s RSA private key |
| `signatureAlgorithm` | Algorithm used (e.g., RSA-SHA256) |

> ⚠ **Security Warning:** Without a digital signature, the encrypted file content could potentially be replaced by an attacker.

### 4️⃣ Key Reference Fields (IMPORTANT)
*Tracks which keys were used for audit and rotation.*

| Field | Purpose |
| :--- | :--- |
| `receiverPublicKeyId` | ID of the public key used to encrypt the AES key |
| `senderPublicKeyId` | ID of the public key used to verify the signature |
| `keyVersion` | version identifier for key rotation handling |

### 5️⃣ Metadata Fields (Optional)
| Field | Purpose |
| :--- | :--- |
| `fileName` | Original file name |
| `fileSize` | File size in bytes |
| `mimeType` | MIME type (e.g., application/pdf) |
| `timestamp` | ISO timestamp of sharing |
| `expiryDate` | Date when access expires |
| `accessLevel` | Permissions (e.g., VIEW, DOWNLOAD) |

---

## 📦 Secure Payload Model (JSON)

```json
{
  "fileId": "uuid-v4",
  "fileName": "document.pdf",
  "fileSize": 204800,
  "mimeType": "application/pdf",

  "senderOrgId": "org-sender-123",
  "senderUserId": "user-sender-001",

  "receiverOrgId": "org-receiver-456",
  "receiverUserId": "user-receiver-005",

  "encryptedFile": "Base64EncodedData...",
  "encryptedAESKey": "Base64RSAEncryptedKey...",
  "iv": "Base64IV...",
  "authTag": "Base64AuthTag...",

  "fileHash": "SHA256Hash...",
  "digitalSignature": "Base64Signature...",

  "receiverPublicKeyId": "key-rec-123",
  "senderPublicKeyId": "key-send-456",

  "timestamp": "2026-02-14T10:30:00Z",
  "expiryDate": "2026-03-14T10:30:00Z",
  "accessLevel": "VIEW"
}
```

---

## 🔐 Workflow & Decryption Process

### 1. Encryption (Sender Side)
1.  **Generate Keys:** detailed AES-128 key and IV.
2.  **Encrypt File:** Encrypt file content with AES-128 (GCM preferred).
3.  **Encrypt Key:** Encrypt the AES key using the **Receiver's RSA Public Key**.
4.  **Sign:** Hash the file and sign the hash with **Sender's RSA Private Key**.
5.  **Payload:** Construct the Secure Payload with all metadata and encrypted fields.

### 2. Cross-Organization Sharing
*Since users may belong to different organizations:*
*   The system strictly enforces `receiverUserId` and `receiverOrgId`.
*   The encrypted AES key ensures only the holder of the corresponding Private Key (the specific receiver) can access the file.

### 3. Decryption (Receiver Side)
1.  **Verify User:** Check if logged-in `userId` and `orgId` match the payload's `receiverUserId` and `receiverOrgId`.
2.  **Decrypt Key:** Use **Receiver's RSA Private Key** to decrypt `encryptedAESKey` -> obtain AES Key.
3.  **Decrypt File:** Use the decrypted AES Key + IV (+ authTag) to decrypt `encryptedFile`.
4.  **Verify Integrity:**
    *   Calculate SHA-256 hash of the decrypted file.
    *   Verify `digitalSignature` using **Sender's Public Key**.
    *   Compare calculated hash with `fileHash`.

---

## 🚨 Critical Security Rules

1.  ❌ **NEVER** share or store the RSA Private Key.
2.  ❌ **NEVER** store the raw AES Key (always encrypt it).
3.  ❌ **NEVER** use a shared "Master Organization Key" for user-specific data.
4.  ✅ **ALWAYS** include user identity checks (`receiverUserId`).
5.  ✅ **ALWAYS** verify the organization match before attempting decryption.
6.  ✅ **ALWAYS** verify the digital signature to ensure authenticity.
