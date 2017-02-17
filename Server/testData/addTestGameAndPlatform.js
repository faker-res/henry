var db = db.getSiblingDB("playerdb");
var total = 10;

function generateGame(i) {

    var gameName = "testGame" + i;

    db.game.remove({"name": gameName});
    db.game.insert({
                       "name": gameName,
                       "description": "This is test game data"
                   });
}

for (var i = 0; i < total; i++) {
    print(i + " out of " + total);
    generateGame(i);
}

db.platform.remove({});
function generatePlatform(i) {

    var platformName = "testPlatform" + i;

    var gameCursor1 = db.game.find({"name": "testGame1"});
    var game1 = gameCursor1.next();

    var gameCursor2 = db.game.find({"name": "testGame2"});
    var game2 = gameCursor2.next();

    var gameCursor3 = db.game.find({"name": "testGame3"});
    var game3 = gameCursor3.next();

    var gameCursor4 = db.game.find({"name": "testGame4"});
    var game4 = gameCursor4.next();

    db.platform.remove({"name": platformName});

    // Add ObjId of "testGame1" and "testGame2" to the 1st 5 platforms
    if (i < 5) {
        db.platform.insert({
                               "name": platformName,
                               "description": "This is test platform data",
                               //"games": [game1._id, game2._id]
                           });
    }
    // Add ObjId of "testGame3" and "testGame4" to the 2nd 5 platforms
    else {
        db.platform.insert({
                               "name": platformName,
                               "description": "This is test platform data",
                               //"games": [game3._id, game4._id]
                           });
    }
}

for (var i = 0; i < total; i++) {
    print(i + " out of " + total);
    generatePlatform(i);
}

print("create test platform successfully!");