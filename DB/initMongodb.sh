#! /bin/bash
export LC_ALL=C

scriptDir=$(dirname $0)

#mongo ${scriptDir}/initReplicaSet.js
#sleep 2

mongo ${mongo_opts} ${scriptDir}/initAdmindb.js
mongo ${mongo_opts} ${scriptDir}/initPlayerdb.js
mongo ${mongo_opts} ${scriptDir}/initLogsdb.js
mongo ${mongo_opts} ${scriptDir}/initProposal.js
mongo ${mongo_opts} ${scriptDir}/initReward.js
mongo ${mongo_opts} ${scriptDir}/initBasicParam.js
# If you reset the counters without emptying the DB, then the IDs of new records will collide with the existing records!
# However if you do empty your DB, you may want to initialise the counters, because if a counter is upserted multiple times in parallel this can clash.
# Although if that does happen, you can just retry your process, because the counter will have been created during the clash, removing the danger of another parallel upsert.
#mongo ${mongo_opts} ${scriptDir}/initCounter.js

echo -
echo Init is finished!


