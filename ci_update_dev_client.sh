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
killall redis-server
sleep 3
redis-server redis.conf

#restart haproxy server
killall haproxy
haproxy -f LoadBalancer/haproxy.cfg

sleep 3

# kill all node servers
killall node

# start all node servers
NODE_ENV=${env} forever start Client/app.js