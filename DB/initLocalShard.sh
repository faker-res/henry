#!/usr/bin/env bash -e

# Note: This is the setup for localhost shards, not the dev server shards

echo "# WARNING! This will destroy your current DB.  Are you sure (y/N)?"
read answer
if [ "$answer" != y ]
then exit 0
fi

killall mongo mongod mongos || true
sleep 2
ps aux | grep "mong[o]"

rm -rf dbData
mkdir -p dbData/configdb dbData/db{0,1}

bash ./startLocalShard.sh

mongo localhost:27020 --eval "rs.initiate();"
mongo localhost:27021 --eval "rs.initiate();"

shard0_name="$(mongo localhost:27020 --eval "rs.status().set + '/' + rs.status().members[0].name;" | tail -n 1)"
shard1_name="$(mongo localhost:27021 --eval "rs.status().set + '/' + rs.status().members[0].name;" | tail -n 1)"

echo "shard0_name: $shard0_name"
echo "shard1_name: $shard1_name"

mongo << !!!
sh.addShard("${shard0_name}")
sh.addShard("${shard1_name}")
sh.status()
!!!

mongo << !!!
sh.enableSharding( "logsdb" );
sh.shardCollection( "logsdb.accessLog", { "_id" : 1 } );
!!!

echo "Now run:  mongo initShardKeys.js"
echo "And then: bash initMongodb.sh"
