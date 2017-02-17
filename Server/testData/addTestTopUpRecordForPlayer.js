db = db.getSiblingDB("playerdb");
var playerCursor = db.playerInfo.find({"name": playerName});
var player = playerCursor.next();

function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

var accessDate = new Date();
accessDate.setDate( accessDate.getDate() - 1 );
accessDate.setHours(randomInt(12));
accessDate.setMinutes(randomInt(60));
accessDate.setSeconds(randomInt(60));

var PMT_TYPE = ["MasterCard", "VISA", "PayPal"];
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
    }
);

db = db.getSiblingDB("playerdb");
db.playerInfo.update(
    {_id: player._id},
    {
        $inc: {topUpSum: pmtValue, topUpTimes: 1}
    }
);