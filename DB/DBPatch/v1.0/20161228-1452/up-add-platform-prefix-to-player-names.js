var adminDB = db.getSiblingDB("admindb");
var playerDB = db.getSiblingDB("playerdb");

var playerCursor = playerDB.playerInfo.find({});

while (playerCursor.hasNext()) {
    var player = playerCursor.next();
    var platform = adminDB.platform.findOne({_id: player.platform});

    if (platform && platform.prefix) {
        var prefix = platform.prefix;
        if (player.name.substring(0, prefix.length) === prefix) {
            //print("Player name already has platform prefix:", player.name);
        } else {
            print("Need to update player with prefix:", player.name, prefix);
            player.name = prefix + player.name;
            playerDB.playerInfo.save(player);
        }
    }
}
