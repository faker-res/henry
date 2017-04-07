const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");


const cursor = dbconfig.collection_players.find({}).cursor();
var i = 0;
cursor.eachAsync(
    playerData => {
        //insert player name to db
        var newNameRecord = {
            name: playerData.name,
            platform: playerData.platform
        };
        var newRecord = new dbconfig.collection_playerName(newNameRecord);
        newRecord.save().then(
            data => {
                i++;
                console.log("index", i, playerData.playerId);
            },
            error => {}
        );
    }
);
