#!/bin/sh

if [ -f .nvmrc ]; then
  if command -v nvm > /dev/null 2>&1; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install
    nvm use
  else
    echo "\033[0;31mERROR: nvm (Node Version Manager) is not installed.\033[0m"
    echo "Please install nvm: https://github.com/nvm-sh/nvm"
    exit 1
  fi
fi 