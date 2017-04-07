var env = require("../config/env").config();
var dbconfig = require("../modules/dbproperties");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo");

const cursor = dbconfig.collection_players.find().cursor();
var i = 0;
cursor.eachAsync(playerData => {
    if(playerData.lastLoginIp){
        dbPlayerInfo.createPlayerLoginRecord(playerData);
    }
    console.log("index", i);
    i++;
});


