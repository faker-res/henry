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
const cursor = dbconfig.collection_players.find({name: "urick03"}).cursor();
var i = 0;
cursor.eachAsync(playerData => {
    console.log(i + ". start updating " + playerData.name + "'s similarPlayers.");
    var phoneNo = rsaCrypto.decrypt(playerData.phoneNumber);
    dbPlayerInfo.findAndUpdateSimilarPlayerInfo(playerData, phoneNo).then((data) => {
        console.log(data.name + "'s similarPlayers updated.");
    });
    i++;
});
// console.log("UpdateSimilarPlayerInfo ended.");