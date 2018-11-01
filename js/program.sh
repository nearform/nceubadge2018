#!/bin/bash


NAMES='"Nodeconf","Long text test"'
sed -e "s/Badge.NAME||.*/Badge.NAME||[$NAMES];/" badge.js > out.js
espruino --board PIXLJS -ohex out.hex --storage NC:NC.js out.js
rm out.js
nrfjprog --family NRF52 --clockspeed 50000 --sectorerase --program out.hex --reset
