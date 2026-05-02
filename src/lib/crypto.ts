// AES-GCM encryption for localStorage using Web Crypto API
// Uses PBKDF2 key derivation from a passphrase + salt

const PASSPHRASE = 'CitraRasa_HPP_K4s1r_2025!@#SecureKey';
const SALT = 'hpp_kasir_salt_v1_cr';
const ITERATIONS = 100000;

async function getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(PASSPHRASE),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode(SALT),
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

export async function encryptData(plaintext: string): Promise<string> {
    try {
        const key = await getKey();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();

        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoder.encode(plaintext)
        );

        // Format: iv_hex:ciphertext_hex
        return `${bufferToHex(iv.buffer)}:${bufferToHex(encrypted)}`;
    } catch (err) {
        console.error('Encryption failed:', err);
        throw err;
    }
}

export async function decryptData(ciphertext: string): Promise<string> {
    try {
        const [ivHex, dataHex] = ciphertext.split(':');
        if (!ivHex || !dataHex) throw new Error('Invalid encrypted format');

        const key = await getKey();
        const iv = hexToBuffer(ivHex);
        const data = hexToBuffer(dataHex);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (err) {
        console.error('Decryption failed:', err);
        throw err;
    }
}
