#!/usr/bin/env bash -e

scriptDir=$(dirname $0)

local_ip=$(/sbin/ifconfig -a|grep inet|grep -v 127.0.0.1|grep -v inet6|awk '{print $2}'|tr -d "addr:")

maxConns=1200

# Load machine-specific config
if [ -f "$scriptDir/startLocalShard.conf" ]
then . "$scriptDir/startLocalShard.conf"
fi

echo "${local_ip}"

# If that didn't work, you can set it yourself:

# local_ip=192.168.1.99

pkill -u $UID mongod
pkill -u $UID mongos

# Give those old processes some time to cleanup
# Otherwise the servers below may complain that they cannot bind to their ports, because they are still open
sleep 2

# The user might not be able to remove stale socket files if they are owned by root, so remove them as root
#sudo rm /tmp/mongodb-*.sock

# In case of unclean shutdown, remove any lockfiles (my mongods were crashing due to 'Too many open files')
#rm "${scriptDir}"/dbData/*/*.lock

mkdir -p "${scriptDir}/dbData"
mkdir -p "${scriptDir}/log"

# If the folders are owned by root, change the owner to the current user
#sudo chown "$USER" "${scriptDir}"/dbData "${scriptDir}"/log -R

mkdir -p "${scriptDir}/dbData/db0"
mkdir -p "${scriptDir}/dbData/db1"
mkdir -p "${scriptDir}/dbData/configdb"

# Increase the number of open files (aka connections or sockets) that Mongo can have open at any one time
# Explanation: Without this you may see the following warning when running `mongo localhost:2018`:
#     ** WARNING: soft rlimits too low. Number of files is 256, should be at least 1000
# and if you have all the Node servers running, they will make a lot of connections to mongo, so you may experience this from mongoose:
#     MongoError: None of the hosts for replica set rs0 could be contacted.
ulimit -n 2048

#start mongodb servers for rs0
mongod --port 27020 --dbpath "${scriptDir}/dbData/db0" --replSet rs0 --fork --maxConns "${maxConns}" $extra_opts --logpath "${scriptDir}/log/mongod0.log"
mongod --port 27021 --dbpath "${scriptDir}/dbData/db1" --replSet rs1 --fork --maxConns "${maxConns}" $extra_opts --logpath "${scriptDir}/log/mongod1.log"

#start config server
mongod --configsvr --dbpath "${scriptDir}/dbData/configdb" --port 27018 --fork --maxConns "${maxConns}" $extra_opts --logpath "${scriptDir}/log/mongods.log"

# mongos will complain if it cannot connect to :27018, so give the last server some time to start
sleep 5

mongos --configdb "${local_ip}:27018" --port 27017 --fork --maxConns "${maxConns}" --logpath "${scriptDir}/log/mongos.log"

echo "============================="
ps aux | grep "mongo[ds]"

# If this is your first time starting these DBs, then we need to initialise them:
#mongo "localhost:27020" --eval "rs.initiate() ; rs.status()"
#mongo "localhost:27021" --eval "rs.initiate() ; rs.status()"
# Change the addresses for your machine.  The addresses appear as rs.status().set + '/' + rs.status().members[0].name
#mongo --eval "sh.addShard('rs0/Sinonets-MacBook-Pro-4.local:27020')"
#mongo --eval "sh.addShard('rs1/Sinonets-MacBook-Pro-4.local:27021')"
