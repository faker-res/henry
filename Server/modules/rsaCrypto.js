'use strict';
let http = require('http');
let env = require('./../config/sslEnv').config();
let constants = require('constants');

var fs = require('fs')
    , ursa = require('ursa')
    , crt
    , key
    , msg
    ;

// key = ursa.createPrivateKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
// crt = ursa.createPublicKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));

// TESTING
// env.redisUrl = "testkey.fpms8.me";
// env.redisPort = "";

let oldKey, oldCert;

// Legacy key and cert - fallback plan
oldKey = ursa.createPrivateKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
oldCert = ursa.createPublicKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));

let host = "http://" + env.redisUrl;
let options = {
    timeout: 2000,
    hostname: env.redisUrl,
};

if (env.redisPort) {
    host += ":" + env.redisPort;
    options.port = env.redisPort;
}

function getPrivateKey () {
    return new Promise((resolve, reject) => {
        options.path = "/playerPhone.key.pem";

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
            resolve(fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
        })
    }).catch(() => fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
}

function getPublicKey () {
    return new Promise((resolve, reject) => {
        options.path = "/playerPhone.pub";

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
            resolve(fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));
        })
    }).catch(() => fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));
}

if (!key) {
    getPrivateKey().then(
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
    getPublicKey().then(
        data => {
            if (data) {
                crt = ursa.createPublicKey(data);
            } else {
                console.log('getPublicKey key server unreachable ', host);
            }
        }
    )
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
                decrypted = oldCert.publicDecrypt(msg, 'base64', 'utf8')
            } catch (e) {
                decrypted = msg;
            }
        }

        return decrypted;
    },
    oldEncrypt: (msg) => {
        let encrypted = msg;

        try {
            encrypted = oldKey.privateEncrypt(msg, 'utf8', 'base64');
        } catch (e) {
            encrypted = msg;
        }

        return encrypted;
    },
    oldDecrypt: (msg) => {
        let decrypted = msg;

        try {
            decrypted = oldCert.publicDecrypt(msg, 'base64', 'utf8')
        } catch (e) {
            decrypted = msg;
        }

        return decrypted;
    }
};

// test code
// console.log('Encrypt with Public');
// msg = crt.encrypt("Everything is going to be 200 OK", 'utf8', 'base64');
// console.log('encrypted', msg, '\n');
//
// console.log('Decrypt with Private');
// msg = key.decrypt(msg, 'base64', 'utf8');
// console.log('decrypted', msg, '\n');
//
// console.log('############################################');
// console.log('Reverse Public -> Private, Private -> Public');
// console.log('############################################\n');
//
// console.log('Encrypt with Private (called public)');
// msg = key.privateEncrypt("Everything is going to be 200 OK", 'utf8', 'base64');
// console.log('encrypted', msg, '\n');
//
// console.log('Decrypt with Public (called private)');
// msg = crt.publicDecrypt(msg, 'base64', 'utf8');
// console.log('decrypted', msg, '\n');

// var PromiseA = require('bluebird').Promise;
// var fs = PromiseA.promisifyAll(require('fs'));
// var path = require('path');
// var ursa = require('ursa');
// var mkdirpAsync = PromiseA.promisify(require('mkdirp'));

// code to generate key pair
// function keypair(pathname) {
//     var key = ursa.generatePrivateKey(1024, 65537);
//     var privpem = key.toPrivatePem();
//     var pubpem = key.toPublicPem();
//     var privkey = path.join(pathname, 'playerPhone.key.pem');
//     var pubkey = path.join(pathname, 'playerPhone.pub');
//
//     return mkdirpAsync(pathname).then(function () {
//         return PromiseA.all([
//             fs.writeFileAsync(privkey, privpem, 'ascii')
//             , fs.writeFileAsync(pubkey, pubpem, 'ascii')
//         ]);
//     }).then(function () {
//         return key;
//     });
// }

// if (require.main === module) {
//     PromiseA.all([
//         keypair('bob')
//         , keypair('alice')
//     ]).then(function (keys) {
//         console.log('generated %d keypairs', keys.length);
//     });
// }
