const dbconfig = require("../modules/dbproperties");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo");

// let playerId = process.env.player_id;

console.log('triggered...');
// dbconfig.collection_players.find({_id: "5d785c1242f529084162b4cb"}, {permission: 1, _id: 1}).lean().then(
//     playerData => {
//         if (playerData && playerData.permission) {
//             console.log('player schema data..', playerData);
//             let saveObj = {
//                 // _id: playerData._id,
//                 // permission: playerData.permission
//                 // createTime: curDate
//                 _id: "5d785c1242f529084162b4cb"
//             };
//             console.log('save obj data..', saveObj);
//             dbconfig.collection_playerPermission({saveObj}).save();
//         }
//     }
// );
dbPlayerInfo.migratePermission();
