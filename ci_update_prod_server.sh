#! /bin/bash
env=production
export LC_ALL=C
LOGDIR=/home/forever
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
NODE_ENV=${env} forever start -a -l ${LOGDIR}/Client.log -o ${LOGDIR}/ClientOut.log -e ${LOGDIR}/ClientErr.log  Client/app.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/message.log -o ${LOGDIR}/messageOut.log -e ${LOGDIR}/messageErr.log Server/messageServer.js

NODE_ENV=${env} PORT=9000 forever start -a -l ${LOGDIR}/app.log -o ${LOGDIR}/appOut.log -e ${LOGDIR}/appErr.log Server/app.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/settlement.log -o ${LOGDIR}/settlementOut.log -e ${LOGDIR}/settlementErr.log Server/settlementServer.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/schedule.log -o ${LOGDIR}/scheduleOut.log -e ${LOGDIR}/scheduleErr.log Server/scheduleServer.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/clientAPIServer.log -o ${LOGDIR}/clientAPIServerOut.log -e ${LOGDIR}/clientAPIServerErr.log Server/clientAPIServer.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/provider.log -o ${LOGDIR}/providerOut.log -e ${LOGDIR}/providerErr.log Server/providerAPIServer.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/payment.log -o ${LOGDIR}/paymentOut.log -e ${LOGDIR}/paymentErr.log Server/paymentAPIServer.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/mig.log -o ${LOGDIR}/migOut.log -e ${LOGDIR}/migErr.log Server/dataMigrationServer.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/extRest.log -o ${LOGDIR}/extRestOut.log -e ${LOGDIR}/extRestErr.log Server/externalRESTServer.js

NODE_ENV=${env} forever start -a -l ${LOGDIR}/intRest.log -o ${LOGDIR}/intRestOut.log -e ${LOGDIR}/intRestErr.log Server/internalRESTServer.js




