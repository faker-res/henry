// Configurable inputs:
var platformId = platformId || arg1;
var gameId = gameId || arg2;
var consumeTimes = consumeTimes || arg3;
var providerId = providerId || arg4;
var playersWithConsumption;   // Default: all players get consumption records

var minDate = new Date();
minDate.setHours(0, 0, 0, 0);
minDate.setDate(minDate.getDate() - 1);
var maxDate = new Date();
maxDate.setHours(0, 0, 0, 0);
var delta = maxDate.getTime() - minDate.getTime();

// var documentNumber = 0;
var batchNumber = 10 * 1000;

var gameType = ["Card", "Casual"];

var start = new Date();

var batchDocuments = new Array();
var index = 0;

db = db.getSiblingDB("playerdb");
documentNumber = db.playerInfo.find({platform:  ObjectId(platformId)}).count();

playersWithConsumption = playersWithConsumption || documentNumber;

while(index < playersWithConsumption * consumeTimes) {
    db = db.getSiblingDB("playerdb");
    var playerName = "testStressPlayer"+Math.floor(index/consumeTimes);
    var playerCursor = db.playerInfo.find({"name": playerName});
    if( playerCursor ){
        var player = playerCursor.next();
        for( var i = 0; i < consumeTimes; i++ ){
            var date = new Date(minDate.getTime() + Math.random() * delta);
            var value = Math.random();
            var document = {
                playerId: player._id,
                platformId: ObjectId(platformId),
                providerId: ObjectId(providerId),
                gameId: ObjectId(gameId),
                gameType: gameType[0],
                createTime: date,
                amount: 500,
                validAmount: 400,
                bDirty: false
            };
            batchDocuments[index % batchNumber] = document;
            index++;
            if(index % batchNumber === 0 || index === playersWithConsumption * consumeTimes) {
                db = db.getSiblingDB("logsdb");
                db.playerConsumptionRecord.insert(batchDocuments);
                batchDocuments = [];
                print('Inserted ' + index + ' playerConsumptionRecords.');
            }
        }

    }
}

print('Inserted ' + index + ' playerConsumptionRecords in ' + (new Date() - start)/1000.0 + 's');
