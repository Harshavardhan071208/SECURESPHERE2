
import forge from 'node-forge';

export class ClientCrypto {

    /**
     * Decrypts the RSA-encrypted AES key using the user's Private Key.
     * @param encryptedAesKeyBase64 - The encrypted AES key from the server response.
     * @param privateKeyPem - The user's Private Key string (PEM format).
     * @returns The raw AES key as an ArrayBuffer.
     */
    static decryptAESKey(encryptedAesKeyBase64: string, privateKeyPem: string): ArrayBuffer {
        try {
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const encryptedBytes = forge.util.decode64(encryptedAesKeyBase64);

            // Decrypt using RSA-OAEP (SHA-256) matches common defaults, ensure server used same
            // Our Server uses RSA-OAEP with SHA-256 (default in node-forge for OAEP usually but explicit is better)

            // Server RSAUtil uses:
            // return publicKey.encrypt(data, 'RSA-OAEP', { md: forge.md.sha256.create() });

            const decryptedKeyRaw = privateKey.decrypt(encryptedBytes, 'RSA-OAEP', {
                md: forge.md.sha256.create(),
                mgf1: { md: forge.md.sha256.create() }
            });

            // Convert raw binary string to ArrayBuffer for Web Crypto
            const buffer = new ArrayBuffer(decryptedKeyRaw.length);
            const view = new Uint8Array(buffer);
            for (let i = 0; i < decryptedKeyRaw.length; i++) {
                view[i] = decryptedKeyRaw.charCodeAt(i);
            }
            return buffer;

        } catch (error) {
            console.error("RSA Decryption Failed:", error);
            throw new Error("Failed to decrypt encryption key. Ensure you have the correct Private Key.");
        }
    }

    /**
     * Decrypts the file content using AES-128-GCM.
     * @param encryptedFileBase64 - The encrypted file content.
     * @param rawAesKey - The decrypted AES key (ArrayBuffer).
     * @param encryptedIvBase64 - The RSA-encrypted IV (Need to decrypt this first? No wait, IV is usually not secret, just unique).
     *                            Our server encrypts IV too? Yes. So we decrypt IV same way as Key.
     * @param authTagBase64 - The GCM Auth Tag.
     * @param privateKeyPem - Private Key to decrypt IV.
     */
    static async decryptFile(
        encryptedFileBase64: string,
        encryptedKeyBase64: string,
        encryptedIvBase64: string,
        authTagBase64: string,
        privateKeyPem: string
    ): Promise<Blob> {

        // 1. Decrypt AES Key & IV using RSA
        const aesKeyBuffer = this.decryptAESKey(encryptedKeyBase64, privateKeyPem);

        // We reuse the same logic for IV since it's just a small blob encrypted with RSA
        const ivBuffer = this.decryptAESKey(encryptedIvBase64, privateKeyPem); // Returns 12 bytes usually

        // 2. Prepare for Web Crypto AES-GCM

        // Import Key
        const key = await window.crypto.subtle.importKey(
            "raw",
            aesKeyBuffer,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        // Convert Base64 File and AuthTag to Buffers
        const fileBytes = Uint8Array.from(atob(encryptedFileBase64), c => c.charCodeAt(0));
        const authTagBytes = Uint8Array.from(atob(authTagBase64), c => c.charCodeAt(0));

        // Create the Ciphertext (Cipher + Tag)
        // Web Crypto expects the tag to be APPENDED to the ciphertext
        const combinedBuffer = new Uint8Array(fileBytes.length + authTagBytes.length);
        combinedBuffer.set(fileBytes);
        combinedBuffer.set(authTagBytes, fileBytes.length);

        // 3. Decrypt
        try {
            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: ivBuffer, // ArrayBuffer
                },
                key,
                combinedBuffer // BufferSource
            );

            return new Blob([decryptedContent]);
        } catch (e) {
            console.error("AES-GCM Decryption Failed:", e);
            throw new Error("File integrity check failed or wrong key.");
        }
    }
}
