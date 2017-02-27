"use strict";

var env = require("../config/env").config();
var CronJob = require('cron').CronJob;
var dbPlatform = require("../db_modules/dbPlatform.js");
require('../modules/debugTools').init();

var config = {
    botPlatformObjId: process.env.BOT_PLATFORM || "5732dad105710cf94b5cfaaa",
    botPlatformRegexp: /Bot *Platform/i,
    //botNamePrefix: 'BotPlayer',
    // Try to add topup for any player, regardless of name, may not succeed if their password does not match botPassword.
    botNamePrefix: '',
    botPassword: '123456',
    testApiUserData: {
        role: "botTesting",
        name: "testClientApiUsername",
        password: "123"
        //lastLoginIp: "192.168.3.22"
    },
    // The job will run every minutes minutes
    minutes: 10,
    // When creating and approving topup proposals, there will be this many connections open to the provider server, each processing one player
    PARALLEL_WORKERS: 200,
    // Set this to 0 to add no players
    maxPlayersToAdd: 0,
    separateSocketPerRegistration: true,
    // Set probabilities to 1.0 to add records for every player, or to 0 to never add records.
    // Set to a whole number over 1 to add that many records.
    probabilityOfAddingConsumptionRecord: 0.8,
    probabilityOfAddingTopUpRecord: 0.3,
    // Limit for the random pause between sending records (milliseconds)
    maxDelayBetweenRecords: 200,
    // Sends the consumptions for one player in parallel.  Unrealistic, but tests the consumption summary queue.
    // At least that was the idea.  In fact, the queue doesn't seem to get more than 1 record queued up!  (Although occasionally 2 of a different type are processed, due to PARALLEL_WORKERS.)
    sendPlayersConsumptionsInParallel: false,

    // For new player simulation
    timeBetweenSpawns: 60 * 1000,
    spawnProbability: 0.2,
    newPlayerProbability: 0.1,
    registrationIntentionProbability: 0.1,
    maxActivePlayers: 1000,
    timeBetweenActions: 1000
};

if (env.mode === 'development') {
    config.newPlayerProbability = 0.05;
}

// Note: To *actually* stress test the consumption queue, I had to increase the setTimeout(processNext, _) duration in dbPlayerConsumptionRecord.js
//       Otherwise it seems it could save and update consumption summaries faster than we could send them!
var stressTestConsumptionQueue = false;
//var stressTestConsumptionQueue = true;

if (stressTestConsumptionQueue) {
    Object.assign(config, {
        PARALLEL_WORKERS: 2,
        probabilityOfAddingConsumptionRecord: 20,
        probabilityOfAddingTopUpRecord: 0,
        maxDelayBetweenRecords: 0,
        sendPlayersConsumptionsInParallel: true
    });
}


var playerSimulator = require('./playerSimulator')(config);
var platformUpdater = require('./platformUpdater')(config);

function doCronjob () {
    console.log(Array(79).join('='));

    return Promise.resolve().then(
        () => platformUpdater.doUpdatesForAllPlatforms()
    ).then(
        () => playerSimulator.simulatePlayers(config)
    );
}



// Main

var onceOnly = process.argv.indexOf('--once') >= 0;

if (!onceOnly) {
    /* This function is executed every N minutes */
    var minuteJob = new CronJob(
        `0 */${config.minutes} * * * *`,
        () => {
            // We add a random delay so jobs won't start exactly on the cronjob moment
            // Ideally the job will complete within half of `config.minutes`.
            var delay = Math.random() * 0.5 * config.minutes * 60 * 1000;
            console.log(Date(), `Will start job in ${Math.round(delay / 1000)} seconds.`);
            setTimeout(doCronjob, delay);
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
