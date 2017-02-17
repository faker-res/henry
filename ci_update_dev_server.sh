#! /bin/bash
env=development
export LC_ALL=C

scriptDir=$(dirname $0)

cd ${scriptDir}/

git pull https://VincentWS:sinonet2015@github.com/sinonetsg/NinjaPandaManagement.git develop

cd Client
sudo npm install
sudo npm update

cd ..
cd Server 
sudo npm install
sudo npm update

cd ..
cd Statistics
sudo npm install
sudo npm update

cd ..

# start mongodb
#sh DB/startMongodb.sh

#sleep 1

#sh DB/initMongodb.sh

#restart redis server
#killall redis-server
#sleep 3
#redis-server redis.conf

#restart haproxy server
#killall haproxy
#haproxy -f LoadBalancer/haproxy.cfg

#sleep 3

# kill all node servers
killall node

# start all node servers
NODE_ENV=${env} forever start Server/messageServer.js
#NODE_ENV=${env} forever start Client/app.js
NODE_ENV=${env} PORT=9000 forever start -a -l app.log -o appOut.log -e appErr.log Server/app.js
#NODE_ENV=${env} PORT=9001 forever start Server/app.js
#NODE_ENV=${env} PORT=9002 forever start Server/app.js
NODE_ENV=${env} forever start -a -l settlement.log -o settlementOut.log -e settlementErr.log Server/settlementServer.js

#NODE_ENV=${env} PORT=8080 forever start Statistics/app.js
NODE_ENV=${env} forever start -a -l schedule.log -o scheduleOut.log -e scheduleErr.log Server/scheduleServer.js

#start bot script
#NODE_ENV=${env} forever start -a -l bot.log -o botOut.log -e botErr.log Server/botTesting/botRunner.js




