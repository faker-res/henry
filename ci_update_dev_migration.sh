#! /bin/bash
env=development
export LC_ALL=C

scriptDir=$(dirname $0)

cd ${scriptDir}/

git pull https://VincentWS:sinonet2015@github.com/sinonetsg/NinjaPandaManagement.git develop

cd Server
sudo npm install
sudo npm update

cd ..

# kill all node servers
killall node

# start all node servers
NODE_ENV=${env} forever start -a -l mig.log -o migOut.log -e migErr.log Server/dataMigrationServer.js





