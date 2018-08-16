#!/usr/bin/env bash

echo 'Starting to import...'
sed -e 's/\s/,/ig' IDCList.txt > IDCList.csv | mongoimport -d admindb -c idcIp --type csv --maintainInsertionOrder --fieldFile idcFields.txt --file IDCList.csv

exit 0