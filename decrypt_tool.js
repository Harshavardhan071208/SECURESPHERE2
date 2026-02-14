
const fs = require('fs');
const crypto = require('crypto');
const forge = require('node-forge');

// USAGE: node decrypt.js <input_file.enc> <private_key_file.pem> <encrypted_aes_key_base64> <encrypted_iv_base64>

const args = process.argv.slice(2);
if (args.length < 4) {
    console.error("Usage: node decrypt.js <input_file.enc> <private_key.pem> <enc_aes_key> <enc_iv>");
    process.exit(1);
}

const [inputFile, keyFile, encAesKey, encIv] = args;

try {
    const encryptedFile = fs.readFileSync(inputFile);
    const privateKeyPem = fs.readFileSync(keyFile, 'utf8');

    // 1. Decrypt Keys using RSA
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    const decryptRSA = (encBase64) => {
        const encrypted = forge.util.decode64(encBase64);
        return privateKey.decrypt(encrypted, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: { md: forge.md.sha256.create() }
        });
    };

    console.log("Decrypting Metadata...");
    const aesKeyRaw = decryptRSA(encAesKey);
    const ivRaw = decryptRSA(encIv);

    const aesKey = Buffer.from(aesKeyRaw, 'binary');
    const iv = Buffer.from(ivRaw, 'binary');

    console.log("AES Key:", aesKey.toString('hex'));
    console.log("IV:", iv.toString('hex'));

    // 2. Decrypt File using AES-128-CBC
    const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedFile), decipher.final()]);

    const outputFile = inputFile.replace('.enc', '.decrypted');
    fs.writeFileSync(outputFile, decrypted);
    console.log(`Success! Decrypted file saved to: ${outputFile}`);

} catch (e) {
    console.error("Decryption Failed:", e.message);
    console.error(e);
}
