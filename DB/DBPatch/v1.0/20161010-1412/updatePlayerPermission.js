var db = db.getSiblingDB("playerdb");

db.playerInfo.update(
    { permission: {$exists: false} },
    {
        $set: {permission: {
            applyBonus: true,
            advanceConsumptionReward: true,
            transactionReward: true,
            topupOnline: true,
            topupManual: true,
            alipayTransaction: true,
        }}
    },
    {multi: true}
);

