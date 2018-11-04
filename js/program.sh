#!/bin/bash


NAMESLIST=`cat names.txt`

for NAMES in $NAMESLIST; do
echo ======================================================
echo $NAMES
echo ----------
#NAMES='"Nodeconf","Long text test"'
sed -e "s/Badge.NAME||.*/Badge.NAME||$NAMES;/" badge.js > out.js
espruino --board PIXLJS.json -ohex out.hex out.js
#espruino --board PIXLJS.json -ohex out.hex --storage NC:NC.js out.js
rm out.js

REPEAT=true
while $REPEAT; do
  echo -----------------------
  nrfjprog --family NRF52 --clockspeed 50000 --sectorerase --program out.hex --reset
  echo ------------------------
  read -n1 -r -p "Everything ok?" yn
#  select yn in "Yes" "No"; do
    case $yn in
        [Yy]* ) echo " All Ok"; REPEAT=false break;;
        [Nn]* ) echo " ... Trying again ...";;
        * ) echo "Please answer yes or no.";;
    esac
#  done
done
done


echo ==============
echo DONE
echo ==============

