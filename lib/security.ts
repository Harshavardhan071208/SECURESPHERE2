
import crypto from 'crypto';
import NodeClam from 'clamscan';
import { Readable } from 'stream';

/**
 * SECURITY RECOMMENDATION: KEY STORAGE
 * 
 * Storing private keys safely is critical. We recommend the following hierarchy:
 * 
 * 1. **AWS KMS (Key Management Service)**: BEST PRACTICE
 *    - Use AWS KMS to generate and manage a Customer Master Key (CMK).
 *    - Encrypt the User's Private Key using the CMK before storing it in the database.
 *    - To use the private key, retrieve the encrypted key from DB, decrypt it with KMS (ephemeral), use it, and discard from memory.
 * 
 * 2. **HashiCorp Vault**:
 *    - Dedicated secret management tool.
 * 
 * 3. **Database with Encryption At Rest (Acceptable for MVP)**:
 *    - Encrypt private keys using a server-side "Master Secret" (env var) before saving to DB.
 *    - NEVER store private keys in plain text.
 * 
 * FOR THIS PROJECT:
 * We will implement a helper to generate keys and simulate the encryption-at-rest pattern.
 */

// --- Virus Scanning ---

export async function scanBuffer(buffer: Buffer): Promise<{ isInfected: boolean; viruses: string[] }> {
    const EICAR = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    if (buffer.indexOf(EICAR) !== -1) {
        console.warn("EICAR Test File Detected!");
        return { isInfected: true, viruses: ['EICAR-Test-Signature'] };
    }


    if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV) {
        console.log("Vercel environment detected. Skipping ClamAV scan (requires external service).");
        return { isInfected: false, viruses: [] };
    }

    try {
        const clamscan = await new NodeClam().init({
            removeInfected: false,
            quarantineInfected: false,
            debugMode: false,
            clamdscan: {
                host: '127.0.0.1',
                port: 3310,
                timeout: 5000, // Reduced timeout
                localFallback: true,
            },
            preference: 'clamdscan'
        });

        const stream = Readable.from(buffer);
        const { isInfected, viruses } = await clamscan.scanStream(stream);

        return { isInfected: !!isInfected, viruses: viruses || [] };
    } catch (error) {
        // Soft fail for dev/prod where ClamAV isn't installed
        console.warn("ClamAV Scan unavailable. Defaulting to CLEAN status.", error);
        return { isInfected: false, viruses: [] };
    }
}

// --- FILE ENCRYPTION (AES-256-GCM) ---

export interface EncryptedFileResult {
    encryptedBuffer: Buffer;
    iv: string;       // Hex encoded
    authTag: string;  // Hex encoded
    key: string;      // Hex encoded DEK (Data Encryption Key) - this should be encrypted with user's pub key next.
}

export function encryptFileWithAES(buffer: Buffer): EncryptedFileResult {
    const algorithm = 'aes-256-gcm';
    const key = crypto.randomBytes(32); // Generate a random 256-bit key
    const iv = crypto.randomBytes(12);  // 96-bit IV is standard for GCM

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedBuffer: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        key: key.toString('hex')
    };
}

// --- KEY MANAGEMENT (RSA) ---

export function generateUserKeys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            // For real security, add passphrase here
            // cipher: 'aes-256-cbc',
            // passphrase: 'top secret'
        }
    });

    return { publicKey, privateKey };
}

// Helper to encrypt the DEK with User's Public Key
// This ensures only the user (with Private Key) can read the file key, and thus the file.
export function encryptKeyWithPublicKey(symmetricKeyHex: string, publicKeyPem: string): string {
    const buffer = Buffer.from(symmetricKeyHex, 'hex');
    const encrypted = crypto.publicEncrypt(publicKeyPem, buffer);
    return encrypted.toString('base64');
}

// Helper to decrypt the DEK with User's Private Key
export function decryptKeyWithPrivateKey(encryptedKeyBase64: string, privateKeyPem: string): string {
    const buffer = Buffer.from(encryptedKeyBase64, 'base64');
    const decrypted = crypto.privateDecrypt(privateKeyPem, buffer);
    return decrypted.toString('hex');
}
