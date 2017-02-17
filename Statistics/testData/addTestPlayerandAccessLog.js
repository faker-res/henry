//var db = db.getSiblingDB("playerdb");
var db = db.getSiblingDB("playerdb");
db.playerInfo.remove({});
db = db.getSiblingDB("logsdb");
db.accessLog.remove({});

var total = 10;
for (var i = 0; i < total; i++) {
    generatePlayer(i, 2015, 11, 20);// 2015-Dec-19
    generatePlayer(i + 10, 2015, 11, 20);

    generateAccessLog(i, 2015, 11, 20, 1, 1);
    generateAccessLog(i + 10, 2015, 11, 20, 1, 1);
    if (i % 2 === 0) {
        generateAccessLog(i, 2015, 11, 21, 1, 1);
    }
    if (i % 3 === 0) {
        generateAccessLog(i, 2015, 11, 22, 1, 1);
    }
}

print("create test access logs successfully!");

function generatePlayer(i, y, m, d) {

    var playerId = "testPlayer" + i;
    var regDate = new Date(y, m, d);
    db = db.getSiblingDB("playerdb");
    db.playerInfo.remove({"playerId": playerId});
    db.playerInfo.insert({
        "playerId": playerId,
        "email": "admin@sino.sg",
        "password": "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
        "firstName": "test",
        "lastName": "player",
        "displayName": playerId,
        "bonus": 0,
        "balance": 0,
        "registrationTime": regDate,
    });
}
function generateAccessLog(i, y, m, d, h, u) {

    var playerId = "testPlayer" + i;
    var platforms = ["ios", "android", "web"];
    var platform = platforms[randomInt(3)];
    var accessDate = new Date(y, m, d, h, u);
    db = db.getSiblingDB("logsdb");
    db.accessLog.insert(
        {
            "playerId": playerId,
            "accessTime": accessDate,
            "platform": platform,
        });
}
function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

////////////////////
//var db = db.getSiblingDB("playerdb");
//var total = 10000;
//
//function getInt(maxV, minV) {
//    var min = minV || 0;
//    return parseInt(Math.random() * (maxV - min) + min);
//}
//
//function generatePlayer(i) {
//
//    var playerId = "testPlayer" + i;
//    var yyyy1 = getInt(2015, 2015);
//    var yyyy2 = getInt(2015, 2015);
//    var mm = getInt(13);
//    var dd = getInt(29);
//    var hh = getInt(24);
//    var uu = getInt(60);
//
//    var regDate = new Date(yyyy1, mm, dd, hh, uu, 30, 0);
//    var lastDate = new Date(yyyy2, mm, dd, hh, uu, 30, 0);
//    db.playerInfo.remove({"playerId": playerId});
//    db.playerInfo.insert({
//        "playerId": playerId,
//        "email": "admin@sino.sg",
//        "password": "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
//        "firstName": "test",
//        "lastName": "player",
//        "displayName": playerId,
//        "bonus": 0,
//        "balance": 0,
//        "registrationTime": regDate,
//        "lastAccessTime": lastDate
//    });
//}
//
//function generateAccessLog(i) {
//
//    var randomIndex = randomInt(10000);
//    var playerId = "testPlayer" + randomIndex;
//    var platforms = ["ios", "android", "web"];
//    var platform = platforms[randomInt(3)];
//    var curDate=(new Date()).getTime();
//
//
//    db = db.getSiblingDB("playerdb");
//    var dateCursor = db.playerInfo.find({"playerId": playerId}, {"registrationTime": 1});
//    var date = dateCursor.next();
//    //print(date.registrationTime);
//    var accessDate=new Date(randomInt(date.registrationTime.getTime(),curDate));
//    //print(accessDate);
//    //print('done');
//
//
//    db = db.getSiblingDB("logsdb");
//    db.accessLog.insert(
//        {
//            "playerId": playerId,
//            "accessTime": accessDate,
//            "platform": platform,
//        });
//}
//
//for (var i = 0; i < total; i++) {
//    generatePlayer(i);
//}
//
//print("create test player successfully!");
//var db = db.getSiblingDB("logsdb");
//var total = 100000;
//
//function randomInt(maxV, minV) {
//    var min = minV || 0;
//    return parseInt(Math.random() * (maxV - min) + min);
//}
//
//function generateAccessLog(i) {
//
//    var randomIndex = randomInt(10000);
//    var playerId = "testPlayer" + randomIndex;
//    var platforms = ["ios", "android", "web"];
//    var platform = platforms[randomInt(3)];
//    var curDate=(new Date()).getTime();
//
//
//    db = db.getSiblingDB("playerdb");
//    var dateCursor = db.playerInfo.find({"playerId": playerId}, {"registrationTime": 1});
//    var date = dateCursor.next();
//    //print(date.registrationTime);
//    var accessDate=new Date(randomInt(date.registrationTime.getTime(),curDate));
//    //print(accessDate);
//    //print('done');
//
//
//    db = db.getSiblingDB("logsdb");
//    db.accessLog.insert(
//        {
//            "playerId": playerId,
//            "accessTime": accessDate,
//            "platform": platform,
//        });
//}
//
//for (var i = 0; i < total; i++) {
//    generateAccessLog(i);
//}
//
//print("create test access logs successfully!");