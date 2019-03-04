const express = require('express');
const app = express();
const port = 7000;
const publicRoutes = require('./routes/publicAPI');
const compression = require('compression');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const env = require('./config/env');
const jwtSecret = env.config().socketSecret;

const skipTokenVerificationPaths = [
    "fkpNotify",
    "loginKeyServer",
    "login"
];

app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

app.use(compression());
app.use(bodyParser());

// for token verification
app.use(function(req, res, next) {
    let token = req.body.token;
    let path = req.path.substr(1);
    // skip token verification if method is HEAD, or path is in skipTokenVerificationPaths.
    if(req.method === "HEAD" || skipTokenVerificationPaths.indexOf(path) > -1) {
        next();
        return;
    }
    if (token) {
        console.log("********************** token", token);
        // decode and verifies token
        jwt.verify(token, jwtSecret, function (err, decoded) {
            console.log("********************** err", err);
            console.log("********************** decoded", decoded);
            if (err) {
                // return false if token verification failed
                return res.json({
                    success: false,
                    message: 'Failed to authenticate token.'
                });
            } else {
                req.decoded_token = decoded;
                next();
            }
        });
    } else {
        // return false if no token is provided
        return res.json({
            success: false,
            message: 'No token provided.'
        });
    }
});
app.use('/', publicRoutes);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));