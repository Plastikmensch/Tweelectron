#!/bin/bash

# check if script is run as root
if [ "$EUID" -ne 0 ]
  then
    echo "[Error] Please run as root"
    exit
fi

# check if Tweelectron is running
if pgrep Tweelectron >/dev/null
  then
    echo "[Error] Tweelectron is running"
    exit
fi

# check if directory exists
if [ -d "/usr/share/tweelectron" ]
  then
    echo "Old version exists. Removing..."
    # remove directory
    rm -r /usr/share/tweelectron
fi

echo "Copying new files"
# copy directory to /usr/share
cp -r ./dist/Tweelectron-linux-x64/ /usr/share/tweelectron
# copy icon
cp ./tweelectron.png /usr/share/icons/
# copy desktop file
cp ./tweelectron.desktop /usr/share/applications/
# create symlink
# needed for .desktop to work
ln -s /usr/share/tweelectron/Tweelectron /usr/bin/Tweelectron
echo "Done"
