'use strict';
let http = require('http');
let mainEnv = require('./../config/env').config();
let env = require('./../config/sslEnv').config();
let crypto = require('crypto');
let jwt = require('jsonwebtoken');
let constSystemParam = require('./../const/constSystemParam');
let rp = require('request-promise');

let fs = require('fs'), crt, key, replKey, replCrt;
let fpmsKey = 'Fr0m_FPM$!';
let token = jwt.sign(fpmsKey, constSystemParam.API_AUTH_SECRET_KEY);
const legacyPrivateKeyPath = "/../ssl/playerPhone.key.pem";
const legacyPublicKeyPath = "/../ssl/playerPhone.pub";

// Key selection based on env param
if (!mainEnv.keyMode || (mainEnv.keyMode && mainEnv.keyMode !== 1)) {
    key = fs.readFileSync(__dirname + legacyPrivateKeyPath);
    crt = fs.readFileSync(__dirname + legacyPublicKeyPath);
} else {
    if (!key) { getPrivateKeyFromService(); }
    if (!crt) { getPublicKeyFromService(); }
    if (!replKey) { getReplPrivateKeyFromService(); }
    if (!replCrt) { getReplPublicKeyFromService(); }
}

let oldKey, oldCert;

// Legacy key and cert - fallback plan
oldKey = fs.readFileSync(__dirname + legacyPrivateKeyPath);
oldCert = fs.readFileSync(__dirname + legacyPublicKeyPath);

// 3rd party payment system key
// let fkpKey, fkpCert;
// fkpKey = fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.key.pem');
// fkpCert = fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.pub');
let host = env.redisUrl;
let options = {
    timeout: 10000,
    hostname: env.redisUrl,
};

if (env.redisPort) {
    host += ":" + env.redisPort;
    options.port = env.redisPort;
}

module.exports = {
    encrypt: (msg) => {
        let encrypted = msg;

        try {
            encrypted = crypto.privateEncrypt(key, Buffer.from(msg, 'utf8'));
        } catch (e) {
            encrypted = msg;
        }

        return Buffer.from(encrypted).toString('base64');
    },
    decrypt: (msg) => {
        let decrypted = msg;

        try {
            decrypted = crypto.publicDecrypt(crt, Buffer.from(msg, 'base64'))
        } catch (e) {
            try {
                decrypted = crypto.publicDecrypt(replCrt, Buffer.from(msg, 'base64'))
            } catch (e) {
                try {
                    decrypted = crypto.publicDecrypt(oldCert, Buffer.from(msg, 'base64'))
                } catch (e) {
                    decrypted = msg;
                }
            }
        }

        decrypted = Buffer.isBuffer(decrypted) ? decrypted.toString() : decrypted;

        return decrypted;
    },
    oldEncrypt: (msg) => {
        let encrypted = msg;

        try {
            encrypted = crypto.privateEncrypt(replKey, Buffer.from(msg, 'base64'));
        } catch (e) {
            encrypted = msg;
        }

        return Buffer.from(encrypted).toString('base64');
    },
    oldDecrypt: (msg) => {
        let decrypted = msg;

        try {
            decrypted = crypto.publicDecrypt(replCrt, Buffer.from(msg, 'base64'))
        } catch (e) {
            decrypted = msg;
        }

        return decrypted;
    },

    legacyEncrypt: (msg) => {
        let encrypted = msg;

        try {
            encrypted = crypto.privateEncrypt(oldKey, Buffer.from(msg, 'utf8'));
        } catch (e) {
            encrypted = msg;
        }

        return Buffer.from(encrypted).toString('base64');
    },

    signFKP: (msg) => {
        let sign = crypto.createSign('sha1');
        sign.update(msg);
        return sign.sign(fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.key.pem'), 'base64');
    },

    refreshKeys: (isReEncrypt) => {
        console.log('REFRESHING KEYS FROM KEY SERVICE');

        return Promise.all([
            getPrivateKeyFromService(), getPublicKeyFromService(),
            getReplPrivateKeyFromService(), getReplPublicKeyFromService()
        ]).then(
            ([a, b, c, d]) => {
                if (isReEncrypt && a && b && c && d) {
                    let dbPlatform = require('./../db_modules/dbPlatform');
                    dbPlatform.reEncryptPlayerPhoneNumber();
                }
            }
        )
    }
};

function getKey (dirPath) {
    return rp(getKeyUrl(dirPath, token)).then(
        data => {
            if (data) {
                let hash = getHash(env.redisUrl);

                if (hash === data) {
                    let secondVerification = getCipherIV(hash, fpmsKey);

                    return rp(getKeyUrl(dirPath, secondVerification));
                }

            }
        }
    ).then(
        keyData => {
            console.log('getKey received', Boolean(keyData));
            return keyData;
        }
    ).catch(() => false);
}

function getPrivateKeyFromService () {
    return getKey("playerPhone.key.pem").then(
        data => {
            if (data) {
                console.log(`RT - Got key from ${options.hostname}`, data);
                key = data;
                return true;
            } else {
                console.log('getPrivateKeyFromService no data', host);
                console.log('Setting as legacy private key..');
                key = fs.readFileSync(__dirname + legacyPrivateKeyPath);
                return false;
            }
        }
    );
}

function getPublicKeyFromService () {
    return getKey("playerPhone.pub").then(
        data => {
            if (data) {
                console.log(`RT - Got cert from ${options.hostname}`, data);
                crt = data;
                return true;
            } else {
                console.log('getPublicKeyFromService no data', host);
                console.log('Setting as legacy public key..');
                crt = fs.readFileSync(__dirname + legacyPublicKeyPath);
                return false;
            }
        }
    )
}

function getReplPrivateKeyFromService () {
    return getKey("playerPhone.key.pem.bak").then(
        data => {
            if (data) {
                console.log(`RT - Got repl key from ${options.hostname}`, data);
                replKey = data;
                return true;
            } else {
                console.log('getReplPrivateKeyFromService no data', host);
                // replKey = fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem');
                return false;
            }
        }
    );
}

function getReplPublicKeyFromService () {
    return getKey("playerPhone.pub.bak").then(
        data => {
            if (data) {
                console.log(`RT - Got repl cert from ${options.hostname}`, data);
                replCrt = data;
                return true;
            } else {
                console.log('getReplPublicKeyFromService no data', host);
                // replCrt = fs.readFileSync(__dirname + '/../ssl/playerPhone.pub');
                return false;
            }
        }
    );
}

function getKeyUrl (dirName, token) {
    let keyUrl = env.redisUrl;

    if (env.redisPort) {
        keyUrl += ":" + env.redisPort;
    }

    keyUrl += "/";
    keyUrl += dirName;
    keyUrl += "?token=";
    keyUrl += token;

    return keyUrl;
}

function getHash (msg) {
    return crypto.createHash('md5').update(msg).digest("hex");
}

function getCipherIV (key, msg) {
    let iv = crypto.randomBytes(16);
    let mykey = crypto.createCipheriv('aes-256-ctr', key, iv);
    let mystr = mykey.update(msg, 'utf8', 'hex');
    mystr += mykey.final('hex');
    return `${iv.toString('hex')}:${mystr}`;
}