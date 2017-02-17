var db = db.getSiblingDB("playerdb");
var total = 1000;

function getInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

var count = null;
var platformIds = [];
var cur = null;

// Grab all existing platforms
for (var i = 0; i < 10; i++) {
    var platformCursor = db.platform.find({"name": "testPlatform" + i});
    var platform = platformCursor.next();
    platformIds.push(platform._id);
}

function generatePlayer(i) {

    var playerName = "testPlayer" + i;

    var yyyy1 = getInt(2015, 2015);
    var yyyy2 = getInt(2015, 2015);
    var mm = getInt(13);
    var dd = getInt(29);
    var hh = getInt(24);
    var uu = getInt(60);

    var regDate = new Date(yyyy1, mm, dd, hh, uu, 30, 0);
    var lastDate = new Date(yyyy2, mm, dd, hh, uu, 30, 0);


    db.playerInfo.remove({"name": playerName});
    db.playerInfo.insert({
        "name": playerName,
        "email": "admin@sino.sg",
        "password": "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
        "realName": "test",
        "registrationTime" : regDate,
        "lastAccessTime": lastDate,
        "platform" : platformIds[Math.floor(Math.random() * platformIds.length)],
        "status": true,
        "playerClass": "Regular",
        "trustLevel": "trust",
        "gold": Math.floor(Math.random() *1000),
        "gameCredit": Math.floor(Math.random() *1000),
        "lastLoginIp": "127.0.0.1",
    });
}

for (var i = 0; i <= total; i++) {
    if(i%10000 == 0){
        print(i + " out of " + total);
    }
    generatePlayer(i);
}
print("create test player successfully!");