#!/bin/bash
if [ "$EUID" -ne 0 ]
  then
    echo "[Error] Please run as root"
    exit
fi
if [ -d "/usr/share/tweelectron" ]
  then
    echo "Old version exists. Removing..."
    rm -r /usr/share/tweelectron
fi
echo "Copying new files"
cp -r ./dist/Tweelectron-linux-x64/ /usr/share/tweelectron
echo "Done"
