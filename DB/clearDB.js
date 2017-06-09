db = db.getSiblingDB("admindb");
db.dropDatabase();

db = db.getSiblingDB("playerdb");
db.dropDatabase();

db = db.getSiblingDB("logsdb");
db.dropDatabase();