#!/usr/bin/env bash

scriptDir=$(dirname $0)

local_ip=`/sbin/ifconfig -a|grep inet|grep -v 127.0.0.1|grep -v inet6|awk '{print $2}'|tr -d "addr:"`

mkdir ${scriptDir}/dbData
mkdir ${scriptDir}/dbData/db0
mkdir ${scriptDir}/dbData/db1
mkdir ${scriptDir}/dbData/db2

mkdir ${scriptDir}/log

mkdir ${scriptDir}/dbData/configdb

mkdir ${scriptDir}/dbData/db3
mkdir ${scriptDir}/dbData/db4
mkdir ${scriptDir}/dbData/db5

killall mongod
killall mongos

sleep 1

#start mongodb servers for rs0
mongod --port 27020 --dbpath ${scriptDir}/dbData/db0 --replSet rs0 --fork --logpath ${scriptDir}/log/mongod0.log
mongod --port 27021 --dbpath ${scriptDir}/dbData/db1 --replSet rs0 --fork --logpath ${scriptDir}/log/mongod1.log
mongod --port 27022 --dbpath ${scriptDir}/dbData/db2 --replSet rs0 --fork --logpath ${scriptDir}/log/mongod2.log

#start mongodb servers for rs1
mongod --port 27030 --dbpath ${scriptDir}/dbData/db3 --replSet rs1 --fork --logpath ${scriptDir}/log/mongod3.log
mongod --port 27031 --dbpath ${scriptDir}/dbData/db4 --replSet rs1 --fork --logpath ${scriptDir}/log/mongod4.log
mongod --port 27032 --dbpath ${scriptDir}/dbData/db5 --replSet rs1 --fork --logpath ${scriptDir}/log/mongod5.log

#start config server
mongod --configsvr --dbpath ${scriptDir}/dbData/configdb --port 27018 --fork --logpath ${scriptDir}/log/mongods.log
#mongos --configdb 192.168.1.15:27018 --port 27017 --fork --logpath ${scriptDir}/log/mongos.log
mongos --configdb ${local_ip}:27018 --port 27017 --fork --logpath ${scriptDir}/log/mongos.log