var today = new Date();
today.setHours(0, 0, 0, 0);

var documentNumber = 0;
var batchNumber = 5 * 1000;

var platformId = arg1;
var providerId = arg2;
var gameId = arg3;
var consumeDays = arg4 || 1;
var playerId = arg5;

var start = new Date();

var batchDocuments = new Array();
var index = 0;

db = db.getSiblingDB("playerdb");
var gameCursor = db.game.find({_id: ObjectId(gameId)});
var gameType = gameCursor.next().type;

documentNumber = db.playerInfo.find({platform: ObjectId(platformId)}).count();

while (index < documentNumber * consumeDays) {
    for (var i = 0; i < consumeDays; i++) {
        var curDate = new Date();
        curDate.setHours(0, 0, 0, 0);
        curDate.setDate(today.getDate() - i);
        var value = Math.random();
        var document = {
            playerId: ObjectId(playerId),
            platformId: ObjectId(platformId),
            providerId: ObjectId(providerId),
            gameId: ObjectId(gameId),
            gameType: gameType,
            date: curDate,
            amount: 1000
        };
        batchDocuments[index % batchNumber] = document;
        index++;
        if (index % batchNumber === 0 || index === documentNumber * consumeDays) {
            db = db.getSiblingDB("logsdb");
            db.gameProviderPlayerDaySummary.insert(batchDocuments);
            batchDocuments = [];
            print('Inserted ' + index + ' documents.');
        }
    }

}

print('Inserted ' + documentNumber * consumeDays + ' in ' + (new Date() - start) / 1000.0 + 's');