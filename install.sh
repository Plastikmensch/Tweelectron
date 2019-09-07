#!/bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[Error] Please run as root"
  exit
fi
rm -r /usr/share/tweelectron && cp -r ./dist/Tweelectron-linux-x64/ /usr/share/tweelectron
