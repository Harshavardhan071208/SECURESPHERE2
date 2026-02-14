
import forge from 'node-forge';

export class RSAUtil {
    /**
     * Generates a 2048-bit RSA Key Pair
     * Returns PEM formatted strings.
     */
    static generateKeyPair(): { publicKey: string; privateKey: string } {
        const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });

        const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
        const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);

        return { publicKey, privateKey };
    }

    /**
     * Encrypts data (like an AES key or IV) using the Receiver's RSA Public Key
     * @param data - The data to encrypt (Buffer or bytes)
     * @param publicKeyPem - The PEM string of the public key
     * @returns The encrypted data as a Base64 string
     */
    static encrypt(data: Buffer | string, publicKeyPem: string): string {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

        // Convert Buffer to binary string for forge
        let dataStr = '';
        if (Buffer.isBuffer(data)) {
            dataStr = data.toString('binary');
        } else {
            dataStr = data as string;
        }

        const encrypted = publicKey.encrypt(dataStr, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: {
                md: forge.md.sha256.create()
            }
        });

        return forge.util.encode64(encrypted);
    }

    /**
     * Decrypts data using the Private Key
     * @param encryptedBase64 - The encrypted data in Base64
     * @param privateKeyPem - The PEM string of the private key
     * @returns The decrypted data (binary string)
     */
    static decrypt(encryptedBase64: string, privateKeyPem: string): string {
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        const encrypted = forge.util.decode64(encryptedBase64);

        const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: {
                md: forge.md.sha256.create()
            }
        });

        return decrypted;
    }
}
