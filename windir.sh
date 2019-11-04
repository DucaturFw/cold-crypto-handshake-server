#!/bin/sh
sed -e 's#^\(.\):#/\L\1#' -e 's#\\#/#g' | tr -d '\r'
