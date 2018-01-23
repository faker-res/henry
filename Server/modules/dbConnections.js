var mongoose = require('mongoose');
var env = require('./../config/env').config();

var admindb = 'mongodb://' + env.db.adminDBUrl;
var playerdb = 'mongodb://' + env.db.playerDBUrl;
var logsdb = 'mongodb://' + env.db.logsDBUrl;

function createConnection(dbURL, callback) {
    // Database connect options
    var options = {
        replset: {
            socketOptions: {
                keepAlive: 1,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 60000
            }
        },
        server: {
            reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 5000,
            socketOptions: {
                keepAlive: 1,
                connectTimeoutMS: 100000,
                socketTimeoutMS: 100000
            }
        }
    };

    var db = mongoose.createConnection(dbURL, options);

    db.on('error', function (err) {
        console.error(new Date(), String(err));

        //use mongoose option to do reconnect
        // If first connect fails because mongoose is down, don't give up: wait a while and then try again
        // if (err.message && err.message.match(/failed to connect to server .* on first connect/)) {
        //     setTimeout(() => {
        //         console.log("Retrying first connect to " + dbURL + "...");
        //
        //         db.open(dbURL)
        //         // So actually db.open() returns a Promise.  But it seems we don't need to implement the catch,
        //         // because the on('error') listener is already handling errors.
        //         // We just provide a quiet catch to silence the unhandled rejections.
        //             .catch(() => {
        //             });
        //
        //         // But despite silencing rejections here, the very first failure does create an unhandled rejection,
        //         // which we cannot intercept because createConnection() does not return a Promise!
        //     }, 20 * 1000);
        // }
    });

    db.once('open', function () {
        console.log(new Date(), "Mongoose connected to " + dbURL);

        if (callback) {
            callback();
        }
    });

    return db;
}

var db_admin = createConnection(admindb);
var db_player = createConnection(playerdb);
var db_logs = createConnection(logsdb);

var counterSchema = require('./../schema/counter');
var counterModel = db_admin.model('counter', counterSchema, 'counter');

var dbConnections = {
    admindb: db_admin,
    playerdb: db_player,
    logsdb: db_logs,
    counterModel: counterModel
};

module.exports = dbConnections;