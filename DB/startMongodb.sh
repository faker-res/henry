#! /bin/bash

scriptDir=$(dirname $0)

mkdir -p ${scriptDir}/dbData/db01

mkdir -p ${scriptDir}/log

killall mongod
killall mongos

mongod --port 27017 --dbpath ${scriptDir}/dbData/db01 --fork --maxConns 2000 --logpath ${scriptDir}/log/mongod01.log

# mongod --port 27017 --dbpath dbData/db01 --fork --maxConns 100000 --logpath log/mongod01.log

