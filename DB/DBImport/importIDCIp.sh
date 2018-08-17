#!/usr/bin/env bash

echo 'Dropping IDC collection...'
mongo admindb --eval 'db.idcIp.drop()'

echo 'Starting to import...'
sed -e 's/\s/,/g; s/\t/,/g' IDCList.txt > IDCList.csv | mongoimport -d admindb -c idcIp --type csv --maintainInsertionOrder --fieldFile idcFields.txt --file IDCList.csv

echo 'Converting ip to decimal...'
mongo convertIdcIpToInt.js

exit 0