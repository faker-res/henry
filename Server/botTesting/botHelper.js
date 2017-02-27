var dbPlatform = require("../db_modules/dbPlatform.js");
var Q = require("q");
var callAPI = require('../modules/services').callAPI;

function reportError (error) {
    console.error(error.stack || error);
}

function randomNumberInRange (min, max, step) {
    step = step || 1;
    return min + Math.floor(Math.random() * (max - min + step) / step) * step;
}

function randomItemFromList (list) {
    return list[Math.floor(Math.random() * list.length)];
}

function getAllRelevantPlatforms (config) {
    return dbPlatform.getPlatforms({$or: [{name: config.botPlatformRegexp}, {_id: config.botPlatformObjId}]});
}


/**
 * This basically just does `client.disconnect()` but it does not resolve until the connection has finished closing.
 *
 * @param {WebSocketClient} client
 * @returns {*|promise}
 */
function disconnectAndWait (client) {
    return new Q.Promise(
        (resolve, reject) => {
            if (!client.isOpen()) {
                // Since this is usually a cleanup procedure, we won't reject if the socket is unexpectedly already closed.
                // But we will log the unexpected situation.
                console.log("Already disconnected");
                resolve('Already disconnected');
            } else {
                client.disconnect();
                client.addEventListener('close', resolve);
            }
        }
    );
}

function createOnePlayer (clientClient, playerData) {
    var phoneNumber = playerData.phoneNumber || '01234567';

    console.log("Creating one player...");

    return callAPI(clientClient, 'player', 'getSMSCode', {phoneNumber: phoneNumber}).then(
        smsCode => {
            //console.log("smsCode:", smsCode);
            var createPlayerData = Object.assign({}, playerData);
            createPlayerData.phoneNumber = phoneNumber;
            createPlayerData.smsCode = smsCode.data;
            createPlayerData.captcha = "botCaptcha";
            return callAPI(clientClient, 'player', 'create', createPlayerData);
        }
    );
}

module.exports = {
    reportError: reportError,
    randomNumberInRange: randomNumberInRange,
    randomItemFromList: randomItemFromList,
    getAllRelevantPlatforms: getAllRelevantPlatforms,
    disconnectAndWait: disconnectAndWait,
    createOnePlayer: createOnePlayer
};