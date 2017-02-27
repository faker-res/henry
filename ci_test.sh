#! /bin/bash
env=qa
export LC_ALL=C

scriptDir=$(dirname $0)
cd ${scriptDir}/

cd Client
sudo npm install

cd ..
cd Server 
sudo npm install
sudo npm update

cd ..

# sart mongodb
#sudo sh DB/startMongodb.sh

#sleep 1
sudo sh DB/initMongodb.sh

# kill all node servers
killall node

# start all node servers...
forever start Client/app.js
NODE_ENV=${env} forever start Server/messageServer.js
NODE_ENV=${env} PORT=9000 forever start Server/app.js
NODE_ENV=${env} forever start Server/clientAPIServer.js
NODE_ENV=${env} forever start Server/providerAPIServer.js
NODE_ENV=${env} forever start Server/paymentAPIServer.js
NODE_ENV=${env} forever start Server/settlementServer.js

sleep 1

cd Server
NODE_ENV=qa mocha -R spec --timeout 10000


