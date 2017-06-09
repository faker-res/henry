var adminDB = db.getSiblingDB("admindb");
var playerDB = db.getSiblingDB("playerdb");

var playerCursor = playerDB.playerInfo.find({});

while (playerCursor.hasNext()) {
    var player = playerCursor.next();
    //print("player.name:", player.name);

    if (!player.bankCardGroup) {
        var bankGroup = adminDB.platformBankCardGroup.findOne({platform: player.platform, bDefault: true});
        if (bankGroup) {
            print("Adding bankGroup to player:" + player.name);
            playerDB.playerInfo.update({_id: player._id}, {$set: {bankCardGroup: bankGroup._id}});
        } else {
            print("No default bankCardGroup for platform " + player.platform);
        }
    }

    if (!player.merchantGroup) {
        var merchantGroup = adminDB.platformMerchantGroup.findOne({platform: player.platform, bDefault: true});
        if (merchantGroup) {
            print("Adding merchantGroup to player:" + player.name);
            playerDB.playerInfo.update({_id: player._id}, {$set: {merchantGroup: merchantGroup._id}});
        } else {
            print("No default merchantGroup for platform " + player.platform);
        }
    }
}
