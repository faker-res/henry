const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const env = require("./config/env").config();
const webEnv = require('./public/js/webEnv');
const nodeUrl = env.redisUrl || 'localhost';
const port = env.redisPort || 1802;
const jwt = require('jsonwebtoken');
const secret = "$ap1U5eR$";

const privateKeyPath = "./public/playerPhone.key.pem";
const replacedPrivateKeyPath = "./public/playerPhone.key.pem.bak";
const publicKeyPath = "./public/playerPhone.pub";
const replacedPublicKeyPath = "./public/playerPhone.pub.bak";
const fpmsKey = "Fr0m_FPM$!";

let privateKey, publicKey, replacedPrivateKey, replacedPublicKey;

http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
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
                    console.log("jwt verify error - POST", err);
                    redirectToLoginPage();
                } else {
                    // Log this action to system log
                    console.log(`${decoded.adminName} ${req.method} ${req.url}`);

                    let inputData = [];

                    switch(pathname) {
                        case privateKeyPath:
                            req.on('data', data => {
                                inputData.push(data);
                            }).on('end', () => {
                                let buffer = Buffer.concat(inputData);
                                privateKey = buffer.toString();
                                res.end('Success');
                            });
                            break;
                        case replacedPrivateKeyPath:
                            req.on('data', data => {
                                inputData.push(data);
                            }).on('end', () => {
                                let buffer = Buffer.concat(inputData);
                                replacedPrivateKey = buffer.toString();
                                res.end('Success');
                            });
                            break;
                        case publicKeyPath:
                            req.on('data', data => {
                                inputData.push(data);
                            }).on('end', () => {
                                let buffer = Buffer.concat(inputData);
                                publicKey = buffer.toString();
                                res.end('Success');
                            });
                            break;
                        case replacedPublicKeyPath:
                            req.on('data', data => {
                                inputData.push(data);
                            }).on('end', () => {
                                let buffer = Buffer.concat(inputData);
                                replacedPublicKey = buffer.toString();
                                res.end('Success');
                            });
                            break;
                    }
                }
            });
        }
    } else {
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
                    res.setHeader('Content-type', 'text/plain' );
                    res.end(key);
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

console.log(`Server listening on port ${port}`);