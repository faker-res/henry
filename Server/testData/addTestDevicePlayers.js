// befor running script, modify the following parameters
var total = 90;
var platformName = "deviceTest";
var playerNamePrefix = "deviceplayer";
var allDevice = ['XiaoMi', 'Samsung', 'HTC', 'Sony'];
var allOS = ['Windows', "iOS", 'Linux', 'Windows10'];
var allBrowser = ['Chrome', 'Firefox', 'IE', 'Opera'];
// reset the parameters above

// can customise the registration time if wanted

var db = db.getSiblingDB("admindb");

function getInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

var count = null;

var allDevice = ['XiaoMi', 'Samsung', 'HTC', 'Sony'];
var allOS = ['Windows', "iOS", 'Linux', 'Windows10'];
var allBrowser = ['Chrome', 'Firefox', 'IE', 'Opera'];

// Grab all existing platforms

var platformCursor = db.platform.find({"name": platformName});
var platform = platformCursor.next();
var platformId = platform._id;

function getuaObj() {
    return {
        browser: allBrowser[getInt(allBrowser.length)],
        os: allOS[getInt(allOS.length)],
        device: allDevice[getInt(allDevice.length)],
    }
}

function generatePlayer(i) {
    var playerName = playerNamePrefix + i;
    var uaArray = [];
    var uaLength = getInt(4);
    for (var k = 0; k < uaLength; k++) {
        uaArray.push(getuaObj());
    }
    db.playerInfo.remove({"name": playerName});
    // var date = new Date();
    // date.setDate(date.getDate() - Math.random() * 30);
    var a = db.playerInfo.insert({
        "name": playerName,
        playerId: playerName,
        "email": "admin@sino.sg" + i,
        "password": "$2a$10$JtHDQerpL2McGog3n0SC9uqe3q/WnDgZ0TTbDJr0V6tUouku2Oik.",
        "realName": "test",
        // "registrationTime": date,
        // "lastAccessTime": lastDate,
        "platform": platformId,
        "status": true,
        "playerClass": "Regular",
        "trustLevel": "trust",
        "gold": Math.floor(Math.random() * 1000),
        "gameCredit": Math.floor(Math.random() * 1000),
        "lastLoginIp": "127.0.0.1",
        userAgent: uaArray,
    });
    print(a);
}

db = db.getSiblingDB("playerdb");
db.playerInfo.remove({"platform": platformId});

for (var i = 0; i <= total; i++) {
    // if (i % 10000 == 0) {
    print(i + " out of " + total);
    // }
    generatePlayer(i);
}
print("create test player successfully!");