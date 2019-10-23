const dbconfig = require("../modules/dbproperties");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo");

// let playerId = process.env.player_id;

//Makesure player.js => permission uncomment before execute the following db query
migratePermission();
async function migratePermission(id){
    // let playerData = await dbconfig.collection_players.find({}).lean();
    let playerData = await dbconfig.collection_players.find({_id: '5da0169c9c65d6131a1a2a86'}, {permission: 1, _id: 1}).lean()
    if(!playerData){
        return Promise.reject("Get player data failed");
    }
    // dbconfig.collection_players.find({_id: data}, {permission: 1, _id: 1}).lean().then(
    // console.log('player schema data..', playerData);
    for(var i = 0; i < playerData.length; i++){
        if (playerData && playerData[i].permission) {
            let saveObj = {
                _id: playerData[i]._id,
                permission: playerData[i].permission
                // createTime: curDate
                // _id: "5d785c1242f529084162b4cb"
            };
            let saveLog = await dbconfig.collection_playerPermission(saveObj).save();
            if(!saveLog){
                return Promise.reject("Save verification log failed");
            }else{
                //Need to uncomment player.js => permission first, otherwise $unset will not work, permission in playerInfo will not be deleted.
                let deleteLog = await dbconfig.collection_players.update({_id: playerData[i]._id}, {$unset:{permission: true}}).catch(
                    err=>{
                        console.log("unset error", err);
                    }
                );
                console.log('delete data..', deleteLog);
                if(!deleteLog) {
                    return Promise.reject("delete failed");
                }
            }

        }
    }
}

