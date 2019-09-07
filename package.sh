version=$(<./src/tweelectron-version)
tar -C ./dist -zcf Tweelectron-linux-x64-$version.tar.gz Tweelectron-linux-x64
tar -C ./dist -zcf Tweelectron-linux-ia32-$version.tar.gz Tweelectron-linux-ia32
cd ./dist
zip -r ../Tweelectron-win32-ia32-$version.zip Tweelectron-win32-ia32
zip -r ../Tweelectron-win32-x64-$version.zip Tweelectron-win32-x64
