#!/bin/bash

FIXDOC=`./fixdocker.sh`

docker run -d --rm --name shake-server -p 127.0.0.1:3077:3077 -v "$FIXDOC":/usr/src/app -w /usr/src/app node:12.13.0-alpine /bin/sh -c "yarn && yarn start"
