var platformName = 'deviceTest';
var numDays = 60;
// set paremeters above

var db = db.getSiblingDB("admindb");
var platformCursor = db.platform.find({"name": platformName});
var platform = platformCursor.next();
var platformId = platform._id;

db = db.getSiblingDB("admindb");
for (var i = 0; i < numDays; i++) {
    var date = new Date();
    date.setDate(date.getDate() - i);
    db.platformDaySummary.insert(
        {
            "platformId": platformId,
            date: date,
            "consumptionAmount": Math.random() * 500,
            "topUpAmount": Math.random() * 500,
        }
    );
}
