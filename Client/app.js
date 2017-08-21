/**
 * Module dependencies
 */

var express = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    errorHandler = require('errorhandler'),
    morgan = require('morgan'),
    routes = require('./routes/index'),
    //partials = require('./routes/partials'),
    category = require('./routes/category'),
    api = require('./routes/api'),
    http = require('http'),
    path = require('path');

var app = module.exports = express();

var gulp = require('gulp');
require('./gulpfile');
gulp.start('config');

/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public'), {maxage: 43200}));

var env = process.env.NODE_ENV || 'local';

// development only
if (env === 'development') {
    app.use(errorHandler());
}

// production only
if (env === 'production') {
    // TODO
}

/**
 * Routes
 */

// serve index and view partials
app.use('/', routes);
// app.use('/partials', partials);
app.use('/category', category);

// JSON API
app.use('/api', api);

// redirect all others to the index (HTML5 history)
app.get('*', function (req, res, next) {
    res.render('index');
});

//app.use('*', function (req, res, next) {
//    console.log("user start");
//    res.render('index');
//});

/*
 * For file upload handling
 */
var multer = require('multer');
var storage = multer.diskStorage(
    {
        destination: function (req, file, callback) {
            callback(null, './Client/public/images/uploads');
        },
        filename: function (req, file, callback) {
            callback(null, file.fieldname + '-' + Date.now() + ".png");
        }
    }
);
var upload = multer(
    {
        storage: storage
    }
);

app.post('/uploadImage', upload.single('file'), function (req, res, next) {
    res.end(JSON.stringify(req.file));
});

/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port: " + app.get('port'));
});

//TODO::temp code to be deleted
//if (env !== 'local') {
//    var cluster = require('cluster');
//    var numCPUs = require('os').cpus().length;
//    if (cluster.isMaster) {
//        // Fork workers.
//        for (var i = 0; i < numCPUs; i++) {
//            cluster.fork();
//        }
//
//        cluster.on('exit', function (worker, code, signal) {
//            console.log('worker ' + worker.process.pid + ' died');
//        });
//    } else {
//        // TODO:: upgrade to https
//        http.createServer(app).listen(app.get('port'), function () {
//            console.log("Express server listening on port: " + app.get('port'));
//        });
//    }
//}

//http.createServer( function(req, res){
//
//    var host = req.headers['host'];
//    // replace the port in the host
//    host = host.replace(/:\d+$/, ":" + '3030');
//    // determine the redirect destination
//    var destination = ['https://', host, req.url].join('');
//
//    //return res.redirect(destination);
//    res.writeHead(301, { "Location": destination });
//    res.end();
//
//}).listen(app.get('port'), function () {
//    console.log('Express server listening on port ' + app.get('port'));
//});
//
//var https = require('https'),
//    fs = require('fs');
//
//var sslOptions = {
//    key: fs.readFileSync('./ssl/server.key'),
//    cert: fs.readFileSync('./ssl/server.crt'),
//    ca: fs.readFileSync('./ssl/ca.crt'),
//    requestCert: true,
//    rejectUnauthorized: false
//};
//
//var secureServer = https.createServer(sslOptions,app).listen('3030', function(){
//    console.log("Secure Express server listening on port 3030");
//});