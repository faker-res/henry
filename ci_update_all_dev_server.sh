#! /bin/bash
env=development
export LC_ALL=C

scriptDir=$(dirname $0)
cd ${scriptDir}/

git pull https://vincentsnsoft:sinonet2015@github.com/snsoft-my/FPMS.git develop-1.1

cd Client
sudo npm install
sudo npm update

cd ..
cd Server
sudo npm install
sudo npm update

cd ..

# kill all node servers
killall node

# start all node servers...
NODE_ENV=${env} forever start Client/app.js

NODE_ENV=${env} forever start Server/messageServer.js

NODE_ENV=${env} PORT=9000 forever start -a -l app.log -o appOut.log -e appErr.log Server/app.js

NODE_ENV=${env} forever start -a -l settlement.log -o settlementOut.log -e settlementErr.log Server/settlementServer.js

NODE_ENV=${env} forever start -a -l schedule.log -o scheduleOut.log -e scheduleErr.log Server/scheduleServer.js

NODE_ENV=${env} forever start -a -l client.log -o clientOut.log -e clientErr.log Server/clientAPIServer.js
NODE_ENV=${env} forever start -a -l provider.log -o providerOut.log -e providerErr.log Server/providerAPIServer.js
NODE_ENV=${env} forever start -a -l payment.log -o paymentOut.log -e paymentErr.log Server/paymentAPIServer.js




