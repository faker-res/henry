#!/usr/bin/env bash -e

# Collects DB dumps from our remote development servers, storing it in ./backup on the local machine.
#
# Based on: https://docs.mongodb.com/manual/tutorial/backup-sharded-cluster-with-database-dumps/

main_server_host=ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com
auth_db="admindb"
username="adminsinonet"
password="passwordsinonet"
main_server_base_url="mongodb://${username}:${passwordsinonet}@${main_server_host}"
balancer_url="${main_server_base_url}:27017/${auth_db}"
config_server_host_port="${main_server_host}:27018"
rs0_secondary_host_port="${main_server_host}:27022"
rs1_secondary_host_port="${main_server_host}:27032"
rs0_secondary_url="${main_server_base_url}:27022/${auth_db}"
rs1_secondary_url="${main_server_base_url}:27032/${auth_db}"

cd "$(dirname "$0")"

rm -rf ./backup
mkdir -p backup
cd backup

#echo
#echo ">>> Disabling the balancer process"
#mongo "${balancer_url}" << !
#use config
#sh.stopBalancer()
#!


# For each shard replica set in the sharded cluster, connect a mongo shell to the secondary member’s mongod instance and run db.fsyncLock().
# Keep the connection open so that we can unlock again later.  (I was thinking of doing that with a fifo for each instance.)
#mkfifo connection-to-rs0
#mongo "${rs0_secondary_url}" < connection-to-rs0 &
#
#mkfifo connection-to-rs1
#mongo "${rs1_secondary_url}" < connection-to-rs1 &

# TODO: db.fsyncLock()



# TODO: The doc now suggests: If locking a secondary of the CSRS, confirm that the member has replicated data up to some control point.



echo
echo ">>> Backing up the config server"
mongodump --host="$config_server_host_port" --authenticationDatabase="${auth_db}" --username="${username}" --password="${password}" --oplog --out=configsvr

# TODO: We should be using authentication here, like we did with the config server.
echo
echo ">>> Backing up rs0 and rs1 in parallel"
mongodump --host="$rs0_secondary_host_port" --oplog --out=rs0 &
mongodump --host="$rs1_secondary_host_port" --oplog --out=rs1 &
wait


# TODO: db.fsyncUnlock()
#rm -f connection-to-rs0
#rm -f connection-to-rs1

#echo
#echo ">>> Re-enabling the balancer process"
#mongo "${balancer_url}" << !
#use config
#sh.setBalancerState(true)
#!
