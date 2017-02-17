function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

db = db.getSiblingDB("playerdb");
var playerCursor = db.playerInfo.find({"name": playerName});
var player = playerCursor.next();


for( var i = 0; i < 10; i++ ){

    var randomValue = randomInt(-100, 100);

    db = db.getSiblingDB("playerdb");
    db.playerInfo.update(
        {_id: player._id},
        {
            $inc: {validCredit: randomValue}
        }
    );

    var type = randomValue >= 0? "TopUp" : "Consume";
    db = db.getSiblingDB("logsdb");
    db.creditChangeLog.insert(
        {
            playerId: player._id,
            amount: randomValue,
            operationType: type,
            operatorId: null,
            data: null
        }
    );
}


