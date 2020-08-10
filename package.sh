version=$(<./src/tweelectron-version)
tar -C ./dist -zcf Tweelectron-linux-x64-$version.tar.gz Tweelectron-linux-x64
tar -C ./dist -zcf Tweelectron-linux-ia32-$version.tar.gz Tweelectron-linux-ia32
cd ./dist
zip -r ../Tweelectron-win32-ia32-$version.zip Tweelectron-win32-ia32
zip -r ../Tweelectron-win32-x64-$version.zip Tweelectron-win32-x64
# create checksums
cd ..
sha256sum Tweelectron-linux-x64-$version.tar.gz > SHA256SUMS.txt
sha256sum Tweelectron-linux-ia32-$version.tar.gz >> SHA256SUMS.txt
sha256sum Tweelectron-win32-x64-$version.zip >> SHA256SUMS.txt
sha256sum Tweelectron-win32-ia32-$version.zip >> SHA256SUMS.txt