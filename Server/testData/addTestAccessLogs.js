var db = db.getSiblingDB("logsdb");
var total = 100000;

function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

function generateAccessLog(i) {

    var randomIndex = randomInt(10000);
    var playerId = "testPlayer" + randomIndex;
    var platforms = ["ios", "android", "web"];
    var platform = platforms[randomInt(3)];
    var curDate = (new Date()).getTime();

    db = db.getSiblingDB("playerdb");
    var dateCursor = db.playerInfo.find({"playerId": playerId}, {"registrationTime": 1});
    var date = dateCursor.next();
    //print(date.registrationTime);
    var accessDate = new Date(randomInt(date.registrationTime.getTime(), curDate));
    //print(accessDate);
    //print('done');

    db = db.getSiblingDB("logsdb");
    db.accessLog.insert(
        {
            "playerId": playerId,
            "accessTime": accessDate,
            "platform": platform,
        });
}

for (var i = 0; i < total; i++) {
    if (i % 10000 == 0) {
        print(i + " out of " + total);
    }
    generateAccessLog(i);
}

print("create test access logs successfully!");