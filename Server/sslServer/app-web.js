const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const env = require("./config/env").config();
const cred = require("./config/cred");
const nonGatewayEnv = require('./config/env').getNonGatewayConfig()[0];
const port = env.redisPort || 1802;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rp = require('request-promise');
const publicKeyPath = "./public/playerPhone.pub";
const replacedPublicKeyPath = "./public/playerPhone.pub.bak";
const restartFPMSPath = "./public/restartFPMS";
const testKeyPairText = 'TEST ENCRYPTION';

http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url} from ${getIpAddress(req)}`);

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
                                            if (nonGatewayEnv && nonGatewayEnv.redisUrl && !inEffectKeyPair.isFromAnotherInstance) {
                                                let theOtherUrl = nonGatewayEnv.redisUrl;

                                                if (nonGatewayEnv.redisPort) {
                                                    theOtherUrl += ":" + nonGatewayEnv.redisPort;
                                                }

                                                theOtherUrl += req.url;

                                                rp({
                                                    method: 'POST',
                                                    uri: theOtherUrl,
                                                    headers: {
                                                        'x-token': req.headers['x-token']
                                                    },
                                                    body: {
                                                        privateKey: inEffectKeyPair.privateKey,
                                                        publicKey: inEffectKeyPair.publicKey,
                                                    },
                                                    json: true
                                                }).then(
                                                    () => {
                                                        res.end('Success');
                                                    }
                                                );

                                            } else {
                                                res.end('Success');
                                            }
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
                                            if (nonGatewayEnv && nonGatewayEnv.redisUrl && !inEffectKeyPair.isFromAnotherInstance) {
                                                let theOtherUrl = nonGatewayEnv.redisUrl;

                                                if (nonGatewayEnv.redisPort) {
                                                    theOtherUrl += ":" + nonGatewayEnv.redisPort;
                                                }

                                                theOtherUrl += req.url;

                                                rp({
                                                    method: 'POST',
                                                    uri: theOtherUrl,
                                                    headers: {
                                                        'x-token': req.headers['x-token']
                                                    },
                                                    body: {
                                                        privateKey: inEffectKeyPair.privateKey,
                                                        publicKey: inEffectKeyPair.publicKey
                                                    },
                                                    json: true
                                                }).then(
                                                    () => {
                                                        res.end('Success');
                                                    }
                                                );

                                            } else {
                                                res.end('Success');
                                            }
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
                            if (nonGatewayEnv && nonGatewayEnv.redisUrl) {
                                let theOtherUrl = nonGatewayEnv.redisUrl;

                                if (nonGatewayEnv.redisPort) {
                                    theOtherUrl += ":" + nonGatewayEnv.redisPort;
                                }

                                theOtherUrl += req.url;

                                rp({
                                    method: 'POST',
                                    uri: theOtherUrl,
                                    headers: {
                                        'x-token': req.headers['x-token']
                                    }
                                }).then(
                                    () => {
                                        res.end('Success');
                                    }
                                );

                            } else {
                                res.end('Failed');
                            }
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
            }).on('end', async () => {
                buffer = Buffer.concat(inputData);

                try {
                    let loginInfo = JSON.parse(buffer.toString());

                    if (loginInfo.username && loginInfo.password) {
                        let adminInfo = await cred.getAdmin(loginInfo.username.toLowerCase());

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
    } else if (req.method === 'HEAD') {
        res.end('ok');
    }

    function redirectToLoginPage() {
        res.writeHead(302, {
            'location': '/login.html'
        });
        res.end();
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

function validateHash (hashed, plain) {
    let hashingPlain = crypto.createHash('md5').update(plain).digest('hex');

    return hashed === hashingPlain;
}

function getIpAddress (req) {
    return (req.headers['x-forwarded-for'] || '').split(',').pop() ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress
}

console.log(`Server listening on port ${port}`);