
import crypto from 'crypto';

export class AESUtil {
    // AES-128-GCM uses 16 byte key and 16 byte IV (recommended 12 bytes for GCM but 16 is acceptable, node defaults work)
    // Actually, GCM standard IV is 12 bytes. Let's use 12 bytes for best practice if using GCM.
    private static ALGORITHM = 'aes-128-gcm';

    /**
     * Encrypts a file buffer using AES-128-GCM
     * @param fileBytes - The file content as a Buffer
     * @param aesKey - The 16-byte AES key (Buffer)
     * @param iv - The 12-byte IV (Buffer)
     * @returns Object containing encrypted buffer and authTag
     */
    static encrypt(fileBytes: Buffer, aesKey: Buffer, iv: Buffer): { encrypted: Buffer, authTag: Buffer } {
        // Ensure key is 16 bytes (128 bits)
        if (aesKey.length !== 16) {
            throw new Error('AES Key must be 16 bytes for AES-128');
        }

        // GCM typically uses 12 byte IVs
        if (iv.length !== 12 && iv.length !== 16) {
            // allowing 16 for compat, but 12 is optimal
        }

        const cipher = crypto.createCipheriv(AESUtil.ALGORITHM, aesKey, iv) as crypto.CipherGCM;
        const encrypted = Buffer.concat([cipher.update(fileBytes), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return { encrypted, authTag };
    }

    /**
     * Decrypts a file buffer using AES-128-GCM
     * @param encryptedBytes - The encrypted content
     * @param aesKey - The 16-byte AES key
     * @param iv - The IV
     * @param authTag - The GCM Auth Tag
     */
    static decrypt(encryptedBytes: Buffer, aesKey: Buffer, iv: Buffer, authTag: Buffer): Buffer {
        const decipher = crypto.createDecipheriv(AESUtil.ALGORITHM, aesKey, iv) as crypto.DecipherGCM;
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(encryptedBytes), decipher.final()]);
        return decrypted;
    }
}
