const dbconfig = require("../modules/dbproperties");

// let playerId = process.env.player_id;

// Makesure player.js => permission uncomment before execute the following db query
// migratePermission();
// function migratePermission(id) {

   const cursor = dbconfig.collection_players.find({}, {permission: 1, _id: 1}).cursor();
   var i =0;
   cursor.eachAsync(
       playerData => {
           if (playerData) {
               let saveObj = {
                   _id: playerData._id,
                   permission: playerData.permission
               };
               dbconfig.collection_playerPermission(saveObj).save().then();
               i++;
               console.log('LK checking permission migration', i);
           }
       }
   );
    // let playerData = await dbconfig.collection_players.find({}, {permission: 1, _id: 1}).lean()
    // if(!playerData){
    //     return Promise.reject("Get player data failed");
    // }
    // for(var i = 0; i < playerData.length; i++){
    //     if (playerData && playerData[i].permission) {
    //         let saveObj = {
    //             _id: playerData[i]._id,
    //             permission: playerData[i].permission
    //         };
    //         let saveLog = await dbconfig.collection_playerPermission(saveObj).save();
    //         if(!saveLog){
    //             return Promise.reject("Save verification log failed");
    //         }else{
    //             //Need to uncomment player.js => permission first, otherwise $unset will not work, permission in playerInfo will not be deleted.
    //             let deleteLog = await dbconfig.collection_players.update({_id: playerData[i]._id}, {$unset:{permission: true}}).catch(
    //                 err=>{
    //                     console.log("unset error", err);
    //                 }
    //             );
    //             console.log('delete data..', deleteLog);
    //             if(!deleteLog) {
    //                 return Promise.reject("delete failed");
    //             }
    //         }
    //
    //     }
    // }
// }

