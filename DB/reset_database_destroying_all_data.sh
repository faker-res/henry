#!/bin/bash -e

# Beware: This will destroy all the data in your DBs!

# Why might you want to run this?
# - After collection indexes have changed, this will ensure old indexes are cleared and the latest indexes are being used.
# - After shard keys have changed, this will ensure old shard keys are dropped and the latest shard keys are being used.
# - To ensure tests pass on a vanilla database, and not due to the specific data in your DB!
# - After the init script has changed, drop old initial data and use the new data.
# - When doing stress testing, times are better for comparing if we always start from the same point (an empty server).

# If your MongoDB is on a remote machine, specify its location like this:
#export mongo_opts="--host 10.167.11.108 --port 27017"

# If we are not already there, move into DB folder
cd "$(dirname "$0")"

echo '>> Dropping databases'
mongo ${mongo_opts} ./clearDB.js
echo
echo '>> Initialising shard keys'
mongo ${mongo_opts} ./initShardKeys.js
echo
echo '>> Initialising data'
bash ./initMongodb.sh
# This has been removed from initMongodb.sh, so we call it manually here
mongo ${mongo_opts} ./initCounter.js

echo
echo '>> Enabling profiling'
dbs="admindb playerdb logsdb"
# For a non-sharded server:
#ports="27017"
# For sharded servers, we must enabling profiling on each shard:
ports="27020 27021 27022 27030 27031 27032"
for port in $ports; do
  for db in $dbs; do
    mongo mongodb://localhost:$port/$db  --eval 'db.setProfilingLevel(1)' >/dev/null 2>&1
  done
done
# (An alternative method is to start the servers with --profile=1 and optionally --slowms=150)
