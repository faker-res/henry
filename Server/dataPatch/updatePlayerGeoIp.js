var env = require("../config/env").config();
var dbconfig = require("../modules/dbproperties");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo");

const cursor = dbconfig.collection_players.find({province: {$exists: false}}).cursor();
var i = 0;
cursor.eachAsync(playerData => {
    if(playerData.lastLoginIp){
        dbPlayerInfo.updateGeoipws(playerData._id, playerData.platform, playerData.lastLoginIp);
    }
    console.log("index", i);
    i++;
});
