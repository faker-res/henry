#!/usr/bin/env bash -e

# Restores DB data from ./backup into the mongodb shards on localhost.
#
# Based on: https://docs.mongodb.com/manual/tutorial/restore-sharded-cluster/#restore-sh-cl-dmp

# NOTE: Localhost mongo servers should be running *before* starting this script.
#       To start them, run: bash ./startLocalShard.sh

echo "# WARNING! This will wipe your current DB data.  Are you sure (y/N)?"
read answer
if [ "$answer" != y ]
then exit 0
fi

cd "$(dirname "$0")"

scriptDir=$(dirname "$0")
local_ip=$(/sbin/ifconfig -a|grep inet|grep -v 127.0.0.1|grep -v inet6|awk '{print $2}'|tr -d "addr:")
maxConns=1200

shutdown_mongo_server() {
  local host="$1"
  echo
  echo ">> Shutting down: ${host}"
  echo 'db.shutdownServer({force: true});' |
    mongo --host="${host}" admin |
    grep -v " [IW] NETWORK "
}

# Shut down the mongos
#killall mongos
shutdown_mongo_server "localhost:27017"

# Restore the data into each shard
echo
echo ">> Restoring shard data"
mongorestore --host="localhost:27020" --drop --oplogReplay backup/rs0
mongorestore --host="localhost:27021" --drop --oplogReplay backup/rs1

shard0_name="$(mongo "localhost:27020" --eval "rs.initiate(); rs.status().set + '/' + rs.status().members[0].name;" | tail -n 1)"
shard1_name="$(mongo "localhost:27021" --eval "rs.initiate(); rs.status().set + '/' + rs.status().members[0].name;" | tail -n 1)"

# Shut down the shard servers
sleep 2
shutdown_mongo_server "localhost:27020"
shutdown_mongo_server "localhost:27021"

# Restore the config server data
echo
echo ">> Restoring config server"
mongorestore --host="localhost:27018" --drop --oplogReplay backup/configsvr
sleep 2

echo
echo ">> Starting mongos again"
mongos --configdb "${local_ip}:27018" --port 27017 --fork --maxConns "${maxConns}" --logpath "${scriptDir}/log/mongos.log"
# If mongos crashes and the log says "Assertion failure messageShouldHaveNs" then just increase the sleep above.
sleep 2

# After restoring, mongos sees the original shard addresses.  We need to give it the local addresses.
echo
echo ">> Setting shard addresses"
mongo localhost:27017 << !!!
use config
db.shards.update({_id: 'rs0'}, {\$set:{host: "${shard0_name}"}});
db.shards.update({_id: 'rs1'}, {\$set:{host: "${shard1_name}"}});
!!!

# Ask the remaining servers to perform a clean shutdown, because that's less dangerous that startLocalShard.sh killing them.
sleep 2
shutdown_mongo_server "localhost:27017"
shutdown_mongo_server "localhost:27018"

echo
echo ">> Data restored but the servers are stopped.  Now run: bash ./startLocalShard.sh"
echo
