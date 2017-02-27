/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

db = db.getSiblingDB("admindb");
db.dropDatabase();

db = db.getSiblingDB("playerdb");
db.dropDatabase();

db = db.getSiblingDB("logsdb");
db.dropDatabase();