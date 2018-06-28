const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const env = require("./config/env").config();
const port = env.redisPort || 1702;

const privateKeyPath = "./playerPhone.key.pem";
const publicKeyPath = "./playerPhone.pub";
let privateKey, publicKey;

http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);

    // parse URL
    const parsedUrl = url.parse(req.url);
    // extract URL path
    let pathname = `.${parsedUrl.pathname}`;

    if (req.method === 'POST') {
        let inputData = [];

        if (pathname === privateKeyPath) {
            req.on('data', data => {
                inputData.push(data);
            }).on('end', () => {
                let buffer = Buffer.concat(inputData);
                privateKey = buffer.toString();
                console.log('privateKey', privateKey);
                res.end('Success');
            });
        } else if (pathname === publicKeyPath) (
            req.on('data', data => {
                inputData.push(data);
            }).on('end', () => {
                let buffer = Buffer.concat(inputData);
                publicKey = buffer.toString();
                console.log('publicKey', publicKey);
                res.end('Success');
            })
        );
    } else {
        if (pathname === privateKeyPath) {
            res.setHeader('Content-type', 'text/plain' );
            res.end(privateKey);
        } else if (pathname === publicKeyPath) {
            res.setHeader('Content-type', 'text/plain' );
            res.end(publicKey);
        } else {
            // based on the URL path, extract the file extention. e.g. .js, .doc, ...
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
                    res.statusCode = 404;
                    res.end(`File ${pathname} not found!`);
                    return;
                }

                // if is a directory search for index file matching the extention
                if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

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

}).listen(parseInt(port));

console.log(`Server listening on port ${port}`);