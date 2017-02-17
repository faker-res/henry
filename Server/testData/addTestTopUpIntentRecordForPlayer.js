var platformName = platformName || 'testPlatform'+randomInt(10,1);
var playerName = playerName || 'testPlayer'+randomInt(10,1);

function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

var accessDate = new Date();
accessDate.setDate( accessDate.getDate() - 1 );
accessDate.setHours(randomInt(12));
accessDate.setMinutes(randomInt(60));
accessDate.setSeconds(randomInt(60));

db = db.getSiblingDB("playerdb");
var platformCursor = db.platform.find({"name": platformName});
var platform = platformCursor.next();

var status = randomInt(4, 1);

db = db.getSiblingDB("logsdb");
db.playerTopUpIntentRecord.insert(
    {
        "playerName": playerName,
        platformId: platform._id,
        "createTime": accessDate,
        ip: "127.0.0.1",
        operationList: [{playerName: playerName}, {mobile:78576489}],
        status: status,
        mobile: 78576489
    }
);
