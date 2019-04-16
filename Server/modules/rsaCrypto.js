'use strict';
let http = require('http');
let env = require('./../config/sslEnv').config();
let crypto = require('crypto');
let jwt = require('jsonwebtoken');
let shell = require('shelljs');
let constSystemParam = require('./../const/constSystemParam');

let fs = require('fs'), crt, key, replKey, replCrt;

// SSL preparation - comment after SSL online
// key = fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem');
// crt = fs.readFileSync(__dirname + '/../ssl/playerPhone.pub');

let oldKey, oldCert;

// Legacy key and cert - fallback plan
oldKey = fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem');
oldCert = fs.readFileSync(__dirname + '/../ssl/playerPhone.pub');

// 3rd party payment system key
// let fkpKey, fkpCert;
// fkpKey = fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.key.pem');
// fkpCert = fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.pub');

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

if (!key) { getPrivateKeyFromService(); }
if (!crt) { getPublicKeyFromService(); }
if (!replKey) { getReplPrivateKeyFromService(); }
if (!replCrt) { getReplPublicKeyFromService(); }

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

    signFKP: (msg) => {
        let sign = crypto.createSign('sha1');
        sign.update(msg);
        return sign.sign(fs.readFileSync(__dirname + '/../ssl/fukuaipay/fkp.key.pem'), 'base64');
    },

    restartServices: () => {
        shell.exec('pm2 reload all');
    }
};

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

function getPrivateKeyFromService () {
    getKey(options, "/playerPhone.key.pem", "/../ssl/playerPhone.key.pem").then(
        data => {
            if (data) {
                console.log(`RT - Got key from ${options.hostname}, ${data}`);
                key = data;
            } else {
                console.log('getPrivateKeyFromService no data', host);
            }
        }
    );
}

function getPublicKeyFromService () {
    getKey(options, "/playerPhone.pub", "/../ssl/playerPhone.pub").then(
        data => {
            if (data) {
                console.log(`RT - Got cert from ${options.hostname}, ${data}`);
                crt = data;
            } else {
                console.log('getPublicKeyFromService no data', host);
            }
        }
    )
}

function getReplPrivateKeyFromService () {
    getKey(options, "/playerPhone.key.pem.bak", "/../ssl/playerPhone.key.pem").then(
        data => {
            if (data) {
                console.log(`RT - Got repl key from ${options.hostname}`);
                replKey = data;
            } else {
                console.log('getReplPrivateKeyFromService no data', host);
                replKey = fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem');
            }
        }
    );
}

function getReplPublicKeyFromService () {
    getKey(options, "/playerPhone.pub.bak", "/../ssl/playerPhone.pub").then(
        data => {
            if (data) {
                console.log(`RT - Got repl cert from ${options.hostname}`);
                replCrt = data;
            } else {
                console.log('getReplPublicKeyFromService no data', host);
                replCrt = fs.readFileSync(__dirname + '/../ssl/playerPhone.pub');
            }
        }
    );
}