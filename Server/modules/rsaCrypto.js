'use strict';
let http = require('http');
let env = require('./../config/sslEnv').config();
let constants = require('constants');
let crypto = require('crypto');
let jwt = require('jsonwebtoken');
let constSystemParam = require('./../const/constSystemParam');

var fs = require('fs')
    , ursa = require('ursa')
    , crt
    , key
    , replKey
    , replCrt
    , msg
    ;

// SSL preparation - comment after SSL online
key = ursa.createPrivateKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
crt = ursa.createPublicKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));

let oldKey, oldCert;

// Legacy key and cert - fallback plan
oldKey = ursa.createPrivateKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
oldCert = ursa.createPublicKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));

// 3rd party payment system key
let fkpKey, fkpCert;
fkpKey = ursa.createPrivateKey(fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.key.pem'));
fkpCert = ursa.createPublicKey(fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.pub'));

let token = jwt.sign('Fr0m_FPM$!', constSystemParam.API_AUTH_SECRET_KEY);
let host = "http://" + env.redisUrl;
let options = {
    timeout: 10000,
    hostname: env.redisUrl,
};

if (env.redisPort) {
    host += ":" + env.redisPort;
    options.port = env.redisPort;
}

function getKey (options, dirPath, fbPath) {
    return new Promise((resolve, reject) => {
        options.path = dirPath + '?token=' + token;

        http.get(options, response => {
            // handle http errors
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page, status code: ' + response.statusCode));
            }
            // temporary data holder
            const body = [];
            // on every content chunk, push it to the data array
            response.on('data', (chunk) => body.push(chunk));
            // we are done, resolve promise with those joined chunks
            response.on('end', () => resolve(body.join('')));
        }).on('error', (e) => {
            console.log('getKey connection error', e);
            resolve(fs.readFileSync(__dirname + fbPath));
        })
    }).catch(() => fs.readFileSync(__dirname + fbPath));
}

if (!key) {
    getKey(options, "/playerPhone.key.pem", "/../ssl/playerPhone.key.pem").then(
        data => {
            if (data) {
                key = ursa.createPrivateKey(data);
            } else {
                console.log('getPrivateKey no data', host);
            }
        }
    );
}

if (!crt) {
    getKey(options, "/playerPhone.pub", "/../ssl/playerPhone.pub").then(
        data => {
            if (data) {
                crt = ursa.createPublicKey(data);
            } else {
                console.log('getPublicKey key server unreachable ', host);
            }
        }
    )
}

if (!replKey) {
    getKey(options, "/playerPhone.key.pem.bak", "/../ssl/playerPhone.key.pem").then(
        data => {
            if (data) {
                replKey = ursa.createPrivateKey(data);
            } else {
                replKey = ursa.createPrivateKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
            }
        }
    );
}

if (!replCrt) {
    getKey(options, "/playerPhone.pub.bak", "/../ssl/playerPhone.pub").then(
        data => {
            if (data) {
                replCrt = ursa.createPublicKey(data);
            } else {
                // Empty key, use fallback key
                console.log('getPublicReplKey no data', host);
                replCrt = ursa.createPublicKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));
            }
        }
    );
}

module.exports = {
    encrypt: (msg) => {
        let encrypted = msg;

        try {
            encrypted = key.privateEncrypt(msg, 'utf8', 'base64');
        } catch (e) {
            encrypted = msg;
        }

        return encrypted;
    },
    decrypt: (msg) => {
        let decrypted = msg;

        try {
            decrypted = crt.publicDecrypt(msg, 'base64', 'utf8')
        } catch (e) {
            try {
                decrypted = replCrt.publicDecrypt(msg, 'base64', 'utf8')
            } catch (e) {
                try {
                    decrypted = oldCert.publicDecrypt(msg, 'base64', 'utf8');
                } catch (e) {
                    decrypted = msg;
                }
            }
        }

        return decrypted;
    },
    oldEncrypt: (msg) => {
        let encrypted = msg;

        try {
            encrypted = replKey.privateEncrypt(msg, 'utf8', 'base64');
        } catch (e) {
            encrypted = msg;
        }

        return encrypted;
    },
    oldDecrypt: (msg) => {
        let decrypted = msg;

        try {
            decrypted = replCrt.publicDecrypt(msg, 'base64', 'utf8')
        } catch (e) {
            decrypted = msg;
        }

        return decrypted;
    },

    // 3rd party payment system
    fkpEncrypt: (msg) => {
        let encrypted = msg;

        try {
            encrypted = fkpKey.privateEncrypt(msg, 'utf8', 'base64');
        } catch (e) {
            console.log('error', e);
            encrypted = msg;
        }

        console.log('msg encrypted', msg, encrypted);

        return encrypted;
    },

    signFKP: (msg) => {
        let sign = crypto.createSign('sha1');
        sign.update(msg);
        return sign.sign(fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.key.pem'), 'base64');
    }
};