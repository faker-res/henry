function randomInt(maxV, minV) {
    var min = minV || 0;
    return parseInt(Math.random() * (maxV - min) + min);
}

db = db.getSiblingDB("playerdb");
var partnerCursor = db.partner.find({"partnerName": partnerName});
var partner = partnerCursor.next();

db.playerInfo.insert(
    {
        name: playerName,
        partner: partner._id,
        platform: partner.platform,
        topUpSum: 200,
        password: "123"
    }
);

db.partner.update(
    {_id: partner._id},
    {
        $inc: {activePlayers: 1, validPlayers: 1, totalReferrals: 1}
    }
);
