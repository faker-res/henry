var db = db.getSiblingDB("admindb");

db.gameType.remove({});

db.gameType.insert({ gameTypeId: "1", code: "CASUAL", name: "Casual", description: "Classic and fantasy casual games" });
db.gameType.insert({ gameTypeId: "2", code: "CARD", name: "Card", description: "Classic and fantasy card games" });
db.gameType.insert({ gameTypeId: "3", code: "SPORTS", name: "Sports", description: "Sports and professional board games" });