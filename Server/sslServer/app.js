const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const env = require("./config/env").config();
const cred = require("./config/cred");
const theOtherEnv = require("./config/env").getAnotherConfig()[0];
const webEnv = require('./public/js/webEnv');
const nodeUrl = env.redisUrl || 'localhost';
const port = env.redisPort || 1802;
const jwt = require('jsonwebtoken');
const secret = "$ap1U5eR$";
const crypto = require('crypto');
const rp = require('request-promise');

const privateKeyPath = "./public/playerPhone.key.pem";
const replacedPrivateKeyPath = "./public/playerPhone.key.pem.bak";
const publicKeyPath = "./public/playerPhone.pub";
const replacedPublicKeyPath = "./public/playerPhone.pub.bak";
const restartFPMSPath = "./public/restartFPMS";
const fpmsKey = "Fr0m_FPM$!";
const testKeyPairText = 'TEST ENCRYPTION';
const ts = jwt.sign(fpmsKey, secret);
const uh = crypto.createHash('md5').update(env.redisUrl).digest("hex");

let privateKey, publicKey, replacedPrivateKey, replacedPublicKey;

http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Location');

    // parse URL
    const parsedUrl = url.parse(req.url, true);
    // extract URL path
    let pathname = `./public${parsedUrl.pathname}`;
    let query = parsedUrl.query;

    if (req.method === 'POST') {
        // Verify token
        if (req.headers && req.headers['x-token']) {
            jwt.verify(req.headers['x-token'], env.socketSecret, function (err, decoded) {
                if (err || !decoded) {
                    // Jwt token error
                    console.log("jwt verify error - POST", req.headers['x-token'], env.socketSecret, err);
                    redirectToLoginPage();
                } else {
                    // Log this action to system log
                    console.log(`${decoded.adminName} ${req.method} ${req.url}`);

                    let inputData = [];
                    let buffer, inEffectKeyPair, privateEncrypted, privateDecrypted, decryptedText;

                    switch(pathname) {
                        case publicKeyPath:
                            console.log('SAVING IN EFFECT KEY PAIR');

                            req.on('data', data => {
                                inputData.push(data);
                            }).on('end', () => {
                                buffer = Buffer.concat(inputData);

                                try {
                                    inEffectKeyPair = JSON.parse(buffer.toString());

                                    if (!inEffectKeyPair || !inEffectKeyPair.privateKey || !inEffectKeyPair.publicKey) {
                                        res.end('Invalid RSA Key Pair!');
                                    } else {
                                        privateEncrypted = crypto.privateEncrypt(inEffectKeyPair.privateKey, Buffer.from(testKeyPairText, 'utf8'));
                                        privateDecrypted = crypto.publicDecrypt(inEffectKeyPair.publicKey, privateEncrypted);
                                        decryptedText = privateDecrypted.toString();

                                        if (decryptedText === testKeyPairText) {
                                            privateKey = inEffectKeyPair.privateKey;
                                            publicKey = inEffectKeyPair.publicKey;

                                            res.end('Success');
                                        } else {
                                            res.end('Invalid RSA Key Pair!')
                                        }
                                    }
                                } catch (err) {
                                    console.log('error', err);
                                    res.end('Invalid RSA Key Pair!')
                                }
                            });
                            break;
                        case replacedPublicKeyPath:
                            console.log('SAVING REPLACED KEY PAIR');

                            req.on('data', data => {
                                inputData.push(data);
                            }).on('end', () => {
                                buffer = Buffer.concat(inputData);

                                try {
                                    inEffectKeyPair = JSON.parse(buffer.toString());

                                    if (!inEffectKeyPair || !inEffectKeyPair.privateKey || !inEffectKeyPair.publicKey) {
                                        res.end('Invalid RSA Key Pair!');
                                    } else {
                                        privateEncrypted = crypto.privateEncrypt(inEffectKeyPair.privateKey, Buffer.from(testKeyPairText, 'utf8'));
                                        privateDecrypted = crypto.publicDecrypt(inEffectKeyPair.publicKey, privateEncrypted);
                                        decryptedText = privateDecrypted.toString();

                                        if (decryptedText === testKeyPairText) {
                                            replacedPrivateKey = inEffectKeyPair.privateKey;
                                            replacedPublicKey = inEffectKeyPair.publicKey;

                                            res.end('Success');
                                        } else {
                                            res.end('Invalid RSA Key Pair!')
                                        }
                                    }
                                } catch (err) {
                                    console.log('error', err);
                                    res.end('Invalid RSA Key Pair!')
                                }
                            });
                            break;
                        case restartFPMSPath:
                            console.log('REQUEST TO RESTART FPMS');
                            rp({
                                method: 'POST',
                                uri: env.fpmsUpdateKeyAddress,
                                body: {
                                    token: jwt.sign("Restart server", env.socketSecret),
                                    privateKey: Boolean(privateKey),
                                    publicKey: Boolean(publicKey),
                                    replPrivateKey: Boolean(replacedPrivateKey),
                                    replPublicKey: Boolean(replacedPublicKey)
                                },
                                json: true
                            }).then(
                                () => {
                                    res.end('Success');
                                }
                            );
                            break;
                    }
                }
            });
        } else {
            // login verification
            let inputData = [];
            let buffer;

            req.on('data', data => {
                inputData.push(data);
            }).on('end', () => {
                buffer = Buffer.concat(inputData);

                try {
                    let loginInfo = JSON.parse(buffer.toString());

                    if (loginInfo.username && loginInfo.password) {
                        let adminInfo = cred.getAdmin(loginInfo.username.toLowerCase());

                        if (!adminInfo) {
                            res.end(JSON.stringify({
                                success: false,
                                error: {name: "InvalidPassword", message: 'Wrong credential!'}
                            }));
                        } else if (!validateHash(adminInfo.password, loginInfo.password)) {
                            res.end(JSON.stringify({
                                success: false,
                                error: {name: "InvalidPassword", message: 'Password or user name is not correct!'}
                            }));
                        } else {
                            // Valid credential
                            let payload = {
                                adminInfo: adminInfo,
                                loginTime: new Date()
                            };

                            res.end(JSON.stringify({
                                success: true,
                                token: jwt.sign(payload, env.socketSecret)
                            }));
                        }
                    }
                } catch (err) {
                    console.log('error', err);
                    res.end(JSON.stringify({
                        success: false,
                        error: {name: "InvalidPassword", message: 'Error occured!'}
                    }));
                }
            })
        }
    } else if (req.method === 'GET') {
        // GET
        switch(pathname) {
            case privateKeyPath:
                verifyAndSendKey(query, res, privateKey);
                break;
            case replacedPrivateKeyPath:
                verifyAndSendKey(query, res, replacedPrivateKey);
                break;
            case publicKeyPath:
                verifyAndSendKey(query, res, publicKey);
                break;
            case replacedPublicKeyPath:
                verifyAndSendKey(query, res, replacedPublicKey);
                break;
            case './public/login.html':
                readFile(pathname, res);
                break;
            case './public/static.html':
                if (query && query.token) {
                    jwt.verify(query.token, env.socketSecret, function (err, decoded) {
                        if (err || !decoded) {
                            // Jwt token error
                            console.log("jwt verify error", err);
                            redirectToLoginPage();
                        } else {
                            // Log this action to system log
                            console.log(`${decoded.adminName} ${req.method} ${req.url}`);

                            readFile(pathname, res)
                        }
                    });
                } else {
                    redirectToLoginPage();
                }
                break;
            case './public/static.htm': // to prevent people viewing source code
            case './':
                redirectToLoginPage();
                break;
            default:
                readFile(pathname, res);
        }
    } else if (req.method === 'OPTIONS') {
        res.end();
    }

    function redirectToLoginPage() {
        res.writeHead(302, {
            'location': '/login.html'
        });
        res.end();
    }

    function verifyAndSendKey(query, res, key) {
        if (query && query.token) {
            jwt.verify(query.token, secret, (err, decoded) => {
                if (!err && decoded && decoded === fpmsKey) {
                    res.end(uh);
                }

                // Check if it's ciphered data
                if (err && query.token) {
                    const textParts = query.token.split(':');

                    //extract the IV from the first half of the value
                    const IV = Buffer.from(textParts.shift(), 'hex');

                    //extract the encrypted text without the IV
                    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

                    //decipher the string
                    const decipher = crypto.createDecipheriv('aes-256-ctr', uh, IV);
                    let decrypted = decipher.update(encryptedText,  'hex', 'utf8');
                    decrypted += decipher.final('utf8');

                    if (decrypted === fpmsKey) {
                        res.end(key);
                    } else {
                        res.end();
                    }
                }
            });
        } else {
            redirectToLoginPage();
        }
    }

    function readFile(pathName, res) {
        const ext = path.parse(pathName).ext;
        // maps file extention to MIME typere
        const map = {
            '.ico': 'image/x-icon',
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword'
        };

        fs.exists(pathName, function (exist) {
            console.log('exist', exist);
            if(!exist) {
                // if the file is not found, return 404
                pathName = 'public/login.html';
            }

            // read file from file system
            fs.readFile(pathName, function(err, data){
                if(err){
                    res.statusCode = 500;
                    res.end(`Error getting the file: ${err}.`);
                } else {
                    // if the file is found, set Content-type and send data
                    res.setHeader('Content-type', map[ext] || 'text/plain' );
                    res.end(data);
                }
            });
        });
    }
}).listen(parseInt(port));

getKeyFromOtherInstance();

function getKeyFromOtherInstance () {
    let privateKeyProm = privateKey ? Promise.resolve(privateKey) : getPrivateKey();
    let replPrivateKeyProm = replacedPrivateKey ? Promise.resolve(replacedPrivateKey) : getReplPrivateKey();
    let publicKeyProm = publicKey ? Promise.resolve(publicKey) : getPublicKey();
    let replPublicKeyProm = replacedPublicKey ? Promise.resolve(replacedPublicKey) : getReplPublicKey();

    return Promise.all([
        privateKeyProm,
        replPrivateKeyProm,
        publicKeyProm,
        replPublicKeyProm
    ]);

    function getPrivateKey () {
        return rp(getKeyUrl("playerPhone.key.pem", ts)).then(
            data => {
                if (data) {
                    let hash = cred.getHash(env.redisUrl);

                    if (hash === data) {
                        let secondVerification = cred.getCipherIV(hash, fpmsKey);

                        return rp(getKeyUrl("playerPhone.key.pem", secondVerification));
                    }
                }
            }
        ).then(
            keyData => {
                if (keyData) {
                    console.log('SETTING PRIVATE KEY FROM ANOTHER INSTANCE');
                    privateKey = keyData;
                }
            }
        ).catch(
            err => privateKey
        )
    }

    function getReplPrivateKey () {
        return rp(getKeyUrl("playerPhone.key.pem.bak", ts)).then(
            data => {
                if (data) {
                    let hash = cred.getHash(env.redisUrl);

                    if (hash === data) {
                        let secondVerification = cred.getCipherIV(hash, fpmsKey);

                        return rp(getKeyUrl("playerPhone.key.pem.bak", secondVerification));
                    }
                }
            }
        ).then(
            keyData => {
                if (keyData) {
                    console.log('SETTING REPL PRIVATE KEY FROM ANOTHER INSTANCE');
                    replacedPrivateKey = keyData;
                }
            }
        ).catch(
            err => replacedPrivateKey
        )
    }

    function getPublicKey () {
        return rp(getKeyUrl("playerPhone.pub", ts)).then(
            data => {
                if (data) {
                    let hash = cred.getHash(env.redisUrl);

                    if (hash === data) {
                        let secondVerification = cred.getCipherIV(hash, fpmsKey);

                        return rp(getKeyUrl("playerPhone.pub", secondVerification));
                    }
                }
            }
        ).then(
            keyData => {
                if (keyData) {
                    console.log('SETTING PUBLIC KEY FROM ANOTHER INSTANCE');
                    publicKey = keyData;
                }
            }
        ).catch(
            err => publicKey
        )
    }

    function getReplPublicKey () {
        return rp(getKeyUrl("playerPhone.pub.bak", ts)).then(
            data => {
                if (data) {
                    let hash = cred.getHash(env.redisUrl);

                    if (hash === data) {
                        let secondVerification = cred.getCipherIV(hash, fpmsKey);

                        return rp(getKeyUrl("playerPhone.pub.bak", secondVerification));
                    }
                }
            }
        ).then(
            keyData => {
                if (keyData) {
                    console.log('SETTING REPL PUBLIC KEY FROM ANOTHER INSTANCE');
                    replacedPublicKey = keyData;
                }
            }
        ).catch(
            err => replacedPublicKey
        )
    }

    function getKeyUrl (dirName, token) {
        let keyUrl = "http://".concat(theOtherEnv.redisUrl);

        if (theOtherEnv.redisPort) {
            keyUrl += ":" + theOtherEnv.redisPort;
        }

        keyUrl += "/";
        keyUrl += dirName;
        keyUrl += "?token=";
        keyUrl += token;

        return keyUrl;
    }
}

function validateHash (hashed, plain) {
    let hashingPlain = crypto.createHash('md5').update(plain).digest('hex');

    return hashed === hashingPlain;
}

console.log(`Server listening on port ${port}`);