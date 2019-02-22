var http = require('http');
var WebSocket = require('ws');
var dbPlatform = require('../db_modules/dbPlatform');
var ws = null;
var cuLoaded = 0;
var CronJob = require('cron').CronJob;


var config = {
    // The job will run every minutes minutes
    minutes: 1,
    testAccountPassword: "888888",
    testPlatformId: 6
};

var playerLoginSimulator = require('./loginPlayerBot')(config);

var server = http.createServer(function(req, res){
    console.log("Connected to bot service");
}).listen(1234);

function doCronjob() {
    console.log(Array(79).join('='));

    return Promise.resolve().then(
        () => playerLoginSimulator.simulatePlayerLogin(config)
    );
}

// Main

var onceOnly = process.argv.indexOf('--once') >= 0;

if (!onceOnly) {
    /* This function is executed every N minutes */
    var minuteJob = new CronJob(
        `0 */${config.minutes} * * * *`,
        () => {
            doCronjob();
        },
        () => { console.log("Cronjob done.  This message only appears occasionally!"); },
        true
    );
}

doCronjob().then(
    () => {
        if (onceOnly) {
            process.exit();
        }
    }
);