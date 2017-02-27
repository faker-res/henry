/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

'use strict';

var fs = require('fs')
    , ursa = require('ursa')
    , crt
    , key
    , msg
    ;

key = ursa.createPrivateKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.key.pem'));
crt = ursa.createPublicKey(fs.readFileSync(__dirname + '/../ssl/playerPhone.pub'));

module.exports = {
    encrypt: (msg) => key.privateEncrypt(msg, 'utf8', 'base64'),
    decrypt: (msg) => crt.publicDecrypt(msg, 'base64', 'utf8')
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