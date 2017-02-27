var db = db.getSiblingDB("logsdb");
var total = 20;
var PMT_TYPE = ["MasterCard", "VISA", "PayPal"];

function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

function generatePlayerTopUpRecord(i) {

    var randomIndex = randomInt(20);
    var playerId = "testPlayer" + randomIndex;
    var curDate = (new Date()).getTime();

    db = db.getSiblingDB("playerdb");
    var playerCursor = db.playerInfo.find({"name": playerId});
    var player = playerCursor.next();

    var accessDate = new Date();
    accessDate.setDate( accessDate.getDate() - 1 );
    accessDate.setHours(randomInt(12));
    accessDate.setMinutes(randomInt(60));
    accessDate.setSeconds(randomInt(60));

    var pmtType = PMT_TYPE[randomInt(PMT_TYPE.length)];
    var pmtValue = 1000+randomInt(10000);

    db = db.getSiblingDB("logsdb");
    db.playerTopUpRecord.insert(
        {
            "playerId": player._id,
            "platformId": player.platform,
            "createTime": accessDate,
            "amount": pmtValue,
            "topUpType": pmtType
        });
}

db.playerTopUpRecord.remove({});
for (var i = 0; i < total; i++) {
    if (i % 1000 == 0) {
        print(i + " out of " + total);
    }
    generatePlayerTopUpRecord(i);
}

print("create test player top up records successfully!");