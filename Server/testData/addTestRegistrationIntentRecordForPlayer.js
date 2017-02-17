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
db.playerRegistrationIntentRecord.insert(
    {
        "name": playerName,
        platformId: platform._id,
        "createTime": accessDate,
        ip: "127.0.0.1",
        operationList: [{name: playerName}, {mobile:78576489}],
        status: status,
        mobile: 78576489
    }
);



