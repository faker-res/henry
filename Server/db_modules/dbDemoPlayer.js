let dbconfig = require('./../modules/dbproperties');
let dbUtility = require('./../modules/dbutility');
let rsaCrypto = require("./../modules/rsaCrypto");

const constPlayerRegistrationInterface = require('./../const/constPlayerRegistrationInterface');
const constDemoPlayerLogStatus = require('./../const/constDemoPlayerLogStatus');

let dbDemoPlayer = {
    createDemoPlayerLog: (playerData, phoneNumber, deviceData, isBackStageGenerated) => {
        let platformObjId = playerData.platform;
        let inputDevice = isBackStageGenerated ? constPlayerRegistrationInterface.BACKSTAGE : dbUtility.getInputDevice(deviceData);
        let demoPlayerStatus = isBackStageGenerated ? constDemoPlayerLogStatus.FROM_BACKSTAGE : constDemoPlayerLogStatus.PRE_CONVERT;
        let encryptedPhoneNumber;

        let realPlayerProm = Promise.resolve();
        if (phoneNumber && !isBackStageGenerated) {
            encryptedPhoneNumber = rsaCrypto.encrypt(phoneNumber);
            let phoneNumberQuery = {$in: [encryptedPhoneNumber, phoneNumber]};
            realPlayerProm = dbconfig.collection_players.findOne({platform: platformObjId, phoneNumber: phoneNumberQuery, isRealPlayer: true}).lean();
        }

        return realPlayerProm.then(
            realPlayer => {
                if (realPlayer) {
                    demoPlayerStatus = constDemoPlayerLogStatus.OLD_PLAYER;
                }

                let log = {
                    platform: platformObjId,
                    name: playerData.name,
                    device: inputDevice,
                    status: demoPlayerStatus,
                    phoneNumber: encryptedPhoneNumber,
                };

                return dbconfig.collection_createDemoPlayerLog(log).save();
            }
        );
    },

    updatePlayerConverted: (platform, encryptedPhoneNumber) => {
        return dbconfig.collection_createDemoPlayerLog.update({
            platform: platform,
            phoneNumber: encryptedPhoneNumber,
            status: constDemoPlayerLogStatus.PRE_CONVERT
        }, {
            status: constDemoPlayerLogStatus.POST_CONVERT
        }, {
            multi: true
        });
    },

};

module.exports = dbDemoPlayer;