function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

db = db.getSiblingDB("playerdb");
var playerCursor = db.playerInfo.find({"playerId": playerId});
var player = playerCursor.next();

var pmtValue = randomInt(100);
var accessDate = new Date();
db = db.getSiblingDB("admindb");
db.rewardTask.insert(
    {
        playerId: player._id,
        type: "testTask",
        data: {
            amount: pmtValue
        },
        status: "Started",
        createTime: accessDate,
        initAmount: 100,
        currentAmount: 100,

    }
);

db = db.getSiblingDB("playerdb");
db.playerInfo.update(
    {_id: player._id},
    {$set: {lockedCredit: pmtValue}}
);