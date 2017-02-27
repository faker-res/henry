#! /bin/bash

env=api
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

NODE_ENV=${env} forever start -a -l client.log -o clientOut.log -e clientErr.log Server/clientAPIServer.js
NODE_ENV=${env} forever start -a -l provider.log -o providerOut.log -e providerErr.log Server/providerAPIServer.js
NODE_ENV=${env} forever start -a -l payment.log -o paymentOut.log -e paymentErr.log Server/paymentAPIServer.js

sudo cp -avr /home/ec2-user/NinjaPandaManagement/TestPage /var/www/html/

sudo cp -avr /home/ec2-user/NinjaPandaManagement/Server/services /var/www/html/TestPage/
sudo cp -avr /home/ec2-user/NinjaPandaManagement/Server/testAPI /var/www/html/TestPage/






