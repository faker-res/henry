/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var env = require("../config/env").config();
var dbconfig = require("../modules/dbproperties");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo");
var rsaCrypto = require("../modules/rsaCrypto");

console.log("UpdateSimilarPlayerInfo started.");
var i = 0;
dbconfig.collection_players.find().then(results => {
    results.forEach(playerData => {
        console.log(i + ". start updating " + playerData.name + "'s similarPlayers.");
        var phoneNo = playerData.phoneNumber;
        var encryptedPhoneNo = rsaCrypto.encrypt(playerData.phoneNumber);
        playerData.phoneNumbe = encryptedPhoneNo;
        dbPlayerInfo.findAndUpdateSimilarPlayerInfo(playerData, phoneNo).then((data) => {
            console.log(data.name + "'s similarPlayers updated.");
        });
        i++;
    });
});