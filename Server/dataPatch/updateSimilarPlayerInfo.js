var env = require("../config/env").config();
var dbconfig = require("../modules/dbproperties");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo");
var rsaCrypto = require("../modules/rsaCrypto");

console.log("UpdateSimilarPlayerInfo started.");
const cursor = dbconfig.collection_players.find().cursor();
var i = 0;
cursor.eachAsync(playerData => {
    console.log(i + ". start updating " + playerData.name + "'s similarPlayers.");
    var phoneNo = playerData.phoneNumber;
    if (playerData && playerData.phoneNumber) {
        if (playerData.phoneNumber.length > 20) {
            try {
                phoneNo = rsaCrypto.decrypt(playerData.phoneNumber);
            }
            catch (err) {
                console.log(err);
            }
        }
    }
    dbPlayerInfo.findAndUpdateSimilarPlayerInfo(playerData, phoneNo).then((data) => {
        console.log(data.name + "'s similarPlayers updated.");
    });
    i++;
});
// console.log("UpdateSimilarPlayerInfo ended.");