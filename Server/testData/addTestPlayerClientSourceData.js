var db = db.getSiblingDB("logsdb");
var total = 200;
var clientType = ["web", "app", "app1"];
var accessType = ["register", "login"];
var domain = ["google.com", "baidu", "bing"];
function getInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

function generatePlayerClientSourceLog(i) {
    var playerName = "testPlayer" + i;
    var url = "?test1=1"
    db.playerClientSourceLog.insert({
        "playerName": playerName,
        "platformId": "9",
        "domain": domain[getInt(3)],
        "sourceUrl": 'abc',
        clientType: clientType[getInt(3)],
        accessType: accessType[getInt(2)],
        createTime: new Date(new Date().getTime() - getInt(1000 * 3600 * 24 * 365 * 10))
    });
}

for (var i = 0; i <= total; i++) {
    if (i % 10000 == 0) {
        print(i + " out of " + total);
    }
    generatePlayerClientSourceLog(i);
}

print("create test player client source successfully!");