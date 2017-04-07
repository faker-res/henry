// Configurable inputs:
var platformId = platformId || arg1;
var gameId = gameId || arg2;
var numberOfSummaries = numberOfSummaries || 1;   // If more than one is requested, all but the last one will be dirty.
var playersWithConsumption;   // Default: all players get consumption records

var minDate = new Date();
minDate.setHours(0, 0, 0, 0);
minDate.setDate(minDate.getDate() - 1);
var maxDate = new Date();
maxDate.setHours(0, 0, 0, 0);
var delta = maxDate.getTime() - minDate.getTime();

// var documentNumber = 0;
var batchNumber = 5 * 1000;

var gameType = ["Card", "Casual"];

var start = new Date();

var batchDocuments = new Array();
var index = 0;

db = db.getSiblingDB("playerdb");
documentNumber = db.playerInfo.find({platform:  ObjectId(platformId)}).count();

playersWithConsumption = playersWithConsumption || documentNumber;

var oneWeek = 1000 * 60 * 60 * 24 * 7;

for (var playerNumber = 0; playerNumber < playersWithConsumption; playerNumber++) {
    db = db.getSiblingDB("playerdb");
    var playerName = "testStressPlayer" + playerNumber;
    var playerCursor = db.playerInfo.find({"name": playerName});
    if (playerCursor) {
        var player = playerCursor.next();
        for (var i = 0; i < numberOfSummaries; i++) {
        var weeksBack = (numberOfSummaries - 1 - i);   // starts at numberOfSummaries-1, ends at 0.
        gameType.forEach(gType => {
            var date = new Date(minDate.getTime() + Math.random() * delta - weeksBack * oneWeek);
            var value = Math.random();
            var document = {
                playerId: player._id,
                platformId: ObjectId(platformId),
                gameType: gType,
                amount: 2015,
                bDirty: (i < numberOfSummaries - 1),
                createTime: date,
                consumptionRecords: Array(8).join('x').split('x').map( _ => ObjectId(platformId) )
            };
            batchDocuments[index % batchNumber] = document;
            index++;
            if (index % batchNumber === 0 || index === playersWithConsumption * numberOfSummaries) {
                db = db.getSiblingDB("logsdb");
                db.playerConsumptionSummary.insert(batchDocuments);
                batchDocuments = [];
                print('Inserted ' + index + ' playerConsumptionSummaries.');
            }
        });
        }
    }
}

print('Inserted ' + index + ' playerConsumptionSummaries in ' + (new Date() - start)/1000.0 + 's');
