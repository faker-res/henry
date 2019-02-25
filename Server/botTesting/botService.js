var http = require('http');
var CronJob = require('cron').CronJob;
var config = require('./botConfig');
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
        `0 */${config.minutesPerLogin} * * * *`,
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