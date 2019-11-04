#!/bin/sh
if which cmd.exe >> /dev/null; then
  cmd.exe /C cd | ./windir.sh
else
  echo "$PWD"
fi
