const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const env = require("./config/env").config();
const webEnv = require('./config/webEnv');
const port = env.redisPort || 1802;
const jwt = require('jsonwebtoken');

const constSystemParam = require('./../const/constSystemParam');

const privateKeyPath = "./playerPhone.key.pem";
const replacedPrivateKeyPath = "./playerPhone.key.pem.bak";
const publicKeyPath = "./playerPhone.pub";
const replacedPublicKeyPath = "./playerPhone.pub.bak";
const loginPagePath = "./login.html";

let privateKey, publicKey, replacedPrivateKey, replacedPublicKey;

// TEMPORARY USERNAME AND PASSWORD
let username = 'keyuser';
let password = 'KeyUserP@s$w0rd!';

http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Location');

    // parse URL
    const parsedUrl = url.parse(req.url, true);
    // extract URL path
    let pathname = `.${parsedUrl.pathname}`;
    let query = parsedUrl.query;

    if (req.method === 'POST') {
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
            case loginPagePath:
                req.on('data', data => {
                    inputData.push(data);
                }).on('end', () => {
                    let buffer = Buffer.concat(inputData);
                    let loginData = JSON.parse(buffer.toString());

                    if (loginData.username === username && loginData.password === password) {
                        let token = jwt.sign(loginData, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});
                        res.setHeader('X-Token', token);
                        res.setHeader('Location', 'static.html?token=' + token);
                        res.statusCode = 201;
                        res.end();
                    } else {
                        res.end();
                    }
                });
                break;
        }
    } else {
        // GET
        console.log('path name', pathname);

        switch(pathname) {
            case privateKeyPath:
                res.setHeader('Content-type', 'text/plain' );
                res.end(privateKey);
                break;
            case replacedPrivateKeyPath:
                res.setHeader('Content-type', 'text/plain' );
                res.end(replacedPrivateKey);
                break;
            case publicKeyPath:
                res.setHeader('Content-type', 'text/plain' );
                res.end(publicKey);
                break;
            case replacedPublicKeyPath:
                res.setHeader('Content-type', 'text/plain' );
                res.end(replacedPublicKey);
                break;
            case './static.html':
                if (query && query.token) {
                    jwt.verify(query.token, constSystemParam.API_AUTH_SECRET_KEY, function (err, decoded) {
                        if (err || !decoded) {
                            // Jwt token error
                            console.log("jwt verify error", err);
                            redirectToLoginPage();
                        } else {
                            let renderPath = "./static.html";
                            fs.exists(renderPath, function (exist) {
                                if(!exist) {
                                    // if the file is not found, return 404
                                    renderPath = './login.html';
                                }

                                fs.readFile(renderPath, function(err, data){
                                    if(err){
                                        res.statusCode = 500;
                                        res.end(`Error getting the file: ${err}.`);
                                    } else {
                                        // if the file is found, set Content-type and send data
                                        res.setHeader('Content-type', 'text/html' );
                                        res.end(data);
                                    }
                                });
                            });
                        }
                    });
                } else {
                    redirectToLoginPage();
                }
                break;
            case './static.htm': // to prevent people viewing source code
            case './':
                redirectToLoginPage();
                break;
            default:
                const ext = path.parse(pathname).ext;
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

                fs.exists(pathname, function (exist) {
                    if(!exist) {
                        // if the file is not found, return 404
                        pathname = './login.html';
                    }

                    // if is a directory search for index file matching the extention
                    // if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

                    // read file from file system
                    fs.readFile(pathname, function(err, data){
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
    }

    function redirectToLoginPage() {
        res.writeHead(302, {
            'location': '/login.html'
        });
        res.end();
    }

}).listen(parseInt(port));

console.log(`Server listening on port ${port}`);