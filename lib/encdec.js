'use strict';

const crypto = require('crypto');

const KEY_SIZE_BITS = 128; // e.g. 128, 192 or 256 for AES
const ALGORITHM = `aes-${KEY_SIZE_BITS}-ccm`;

const AAD = Buffer.from('0123456789ab', 'hex');

function encrypt(password, plaintext) {
  // See https://nodejs.org/dist/latest-v10.x/docs/api/crypto.html#crypto_class_cipher

  return new Promise(async (resolve, reject) => {
    let key;
    try {
      key = await scryptAsync(password, 'salt', (KEY_SIZE_BITS / 8));
    } catch (err) {
      reject(err); return;
    }

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: (KEY_SIZE_BITS / 8),
    });
    cipher.setAAD(AAD, {
      plaintextLength: Buffer.byteLength(plaintext),
    });

    let encrypted = cipher.update(plaintext, 'ascii', 'hex');
    encrypted += cipher.final('hex');
    encrypted += iv.toString('hex');
    encrypted += cipher.getAuthTag().toString('hex');

    resolve(encrypted);
  });
}

function decrypt(password, ciphertext) {
  // See https://nodejs.org/dist/latest-v10.x/docs/api/crypto.html#crypto_class_decipher
  // See https://nodejs.org/dist/latest-v10.x/docs/api/crypto.html#crypto_ccm_mode

  return new Promise(async (resolve, reject) => {
    const cipher = ciphertext.substring(0, ciphertext.length - (24 + 32));
    const iv = Buffer.from(ciphertext.substr(ciphertext.length - (24 + 32), 24), 'hex');
    const tag = Buffer.from(ciphertext.substr(ciphertext.length - 32, 32), 'hex');
    const key = await scryptAsync(password, 'salt', KEY_SIZE_BITS / 8);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: (KEY_SIZE_BITS / 8),
    });
    decipher.setAuthTag(tag);
    decipher.setAAD(AAD, {
      plaintextLength: (cipher.length / 2), // NOTE IMPORTANT '/ 2' due to hex encoding above
    });

    const decrypted = decipher.update(cipher, 'hex', 'ascii');
    try {
      decipher.final('ascii');
    } catch (err) {
      reject(new Error('Authentication failed.'));
    }
    resolve(decrypted);
  });
}

function scryptAsync(password, salt, keylen) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

module.exports = {
  encrypt,
  decrypt,
};
