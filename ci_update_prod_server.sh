#! /bin/bash
env=production
export LC_ALL=C

scriptDir=$(dirname $0)
cd ${scriptDir}/

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

NODE_ENV=${env} forever start -a -l message.log -o messageOut.log -e messageErr.log Server/messageServer.js

NODE_ENV=${env} PORT=9000 forever start -a -l app.log -o appOut.log -e appErr.log Server/app.js

NODE_ENV=${env} forever start -a -l settlement.log -o settlementOut.log -e settlementErr.log Server/settlementServer.js

NODE_ENV=${env} forever start -a -l schedule.log -o scheduleOut.log -e scheduleErr.log Server/scheduleServer.js

NODE_ENV=${env} forever start -a -l client.log -o clientOut.log -e clientErr.log Server/clientAPIServer.js
NODE_ENV=${env} forever start -a -l provider.log -o providerOut.log -e providerErr.log Server/providerAPIServer.js
NODE_ENV=${env} forever start -a -l payment.log -o paymentOut.log -e paymentErr.log Server/paymentAPIServer.js

NODE_ENV=${env} forever start -a -l mig.log -o migOut.log -e migErr.log Server/dataMigrationServer.js



