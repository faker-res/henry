var db = db.getSiblingDB("logsdb");
var total = 10000;
var PMT_TYPE = ["MasterCard", "VISA", "PayPal"]
var PMT_CURRENCY = ["SGD", "USD", "CNY","YEN"]
var platforms = ["ios", "android", "web"];

function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

function generateAccessLog(i) {

    var randomIndex = randomInt(10000);
    var playerId = "testPlayer" + randomIndex;
    var platform = platforms[randomInt(platforms.length)];
    var curDate = (new Date()).getTime();

    db = db.getSiblingDB("playerdb");
    var dateCursor = db.playerInfo.find({"playerId": playerId}, {"registrationTime": 1});
    var date = dateCursor.next();
    //print(date.registrationTime);
    var accessDate = new Date(randomInt(date.registrationTime.getTime(), curDate));
    //print(accessDate);
    //print('done');
    var pmtType = PMT_TYPE[randomInt(PMT_TYPE.length)];
    var pmtCrcy = PMT_CURRENCY[randomInt(PMT_CURRENCY.length)];
    var pmtValue = randomInt(10000);

    db = db.getSiblingDB("logsdb");
    db.paymentLog.insert(
        {
            "playerId": playerId,
            "paymentID": accessDate + playerId,
            "paymentTime": accessDate,
            "platform": platform,
            "paymentAmount": pmtValue,
            "paymentCurrency": pmtCrcy,
            "paymentType": pmtType
        });
}

db.paymentLog.remove({});
for (var i = 0; i < total; i++) {
    if (i % 1000 == 0) {
        print(i + " out of " + total);
    }
    generateAccessLog(i);
}

print("create test access logs successfully!");