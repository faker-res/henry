#!/usr/bin/env bash

echo 'Trying to recode from GBK to UTF-8...'
recode GBK..utf8 ip.txt

echo 'Starting to import...'
sed -e 's/|/,/ig' ip.txt > ip.csv | mongoimport -d admindb -c geoIp --type csv --maintainInsertionOrder --fieldFile fields.txt --file ip.csv

exit 0