var today = new Date();
today.setHours(0, 0, 0, 0);

var documentNumber = 0;
var batchNumber = 5 * 1000;

var platformId = arg1;
var consumeDays = arg2 || 1;

var start = new Date();

var batchDocuments = new Array();
var index = 0;

db = db.getSiblingDB("playerdb");
documentNumber = db.playerInfo.find({platform:  ObjectId(platformId)}).count();

while(index < documentNumber*consumeDays) {
    db = db.getSiblingDB("playerdb");
    var playerName = "testStressPlayer"+Math.floor(index/consumeDays);
    var playerCursor = db.playerInfo.find({"name": playerName});
    if( playerCursor ){
        var player = playerCursor.next();
        for( var i = 0; i < consumeDays; i++ ){
            var curDate = new Date();
            curDate.setHours(0, 0, 0, 0);
            curDate.setDate(today.getDate() - i);
            var value = Math.random();
            var document = {
                playerId: player._id,
                platformId: ObjectId(platformId),
                date: curDate,
                amount: 1000
            };
            batchDocuments[index % batchNumber] = document;
            index++;
            if(index % batchNumber === 0 || index === documentNumber*consumeDays) {
                db = db.getSiblingDB("logsdb");
                db.playerConsumptionDaySummary.insert(batchDocuments);
                batchDocuments = [];
                print('Inserted ' + index + ' documents.');
            }
        }
    }
}

print('Inserted ' + documentNumber*consumeDays + ' in ' + (new Date() - start)/1000.0 + 's');