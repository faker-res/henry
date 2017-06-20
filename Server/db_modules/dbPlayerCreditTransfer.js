const dbConfig = require('./../modules/dbproperties');
const constServerCode = require('./../const/constServerCode');
const errorUtils = require("./../modules/errorUtils");
const dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
const constSystemParam = require("../const/constSystemParam.js");

const dbPlayerCreditTransfer = {

    /**
     * Transfer player credit from local to provider
     * @param {String} playerId
     * @param {String} providerId
     */
    playerCreditTransferToProvider: (playerId, providerId) => {

    },

    /**
     * Transfer player credit from provider to local
     * @param {String} playerId
     * @param {String} providerId
     */
    playerCreditTransferFromProvider: (playerId, providerId) => {

    }

};

module.exports = dbPlayerCreditTransfer;