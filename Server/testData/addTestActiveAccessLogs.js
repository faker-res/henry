var db = db.getSiblingDB("logsdb");
var total = 100000;
var activities = ["click", "search", "update", "play"];

function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

function generateAccessLog(i) {

    var randomIndex = randomInt(10000);
    var playerId = "testPlayer" + randomIndex;
    var activity = activities[randomInt(activities.length)];
    var curDate = (new Date()).getTime();

    db = db.getSiblingDB("playerdb");
    var dateCursor = db.playerInfo.find({"playerId": playerId}, {"registrationTime": 1});
    var date = dateCursor.next();
    var accessDate = new Date(randomInt(date.registrationTime.getTime(), curDate));

    db = db.getSiblingDB("logsdb");
    db.activeAccessLog.insert(
        {
            "playerId": playerId,
            "activityTime": accessDate,
            "activityType": activity
        });
}

for (var i = 0; i < total; i++) {
    if (i % 10000 == 0) {
        print(i + " out of " + total);
    }
    generateAccessLog(i);
}

print("create test access logs successfully!");
