#!/bin/bash -e

# If your current shell has node but newly started shells do not (e.g. you usually invoke nvm manually) then we can pass the current environment to tmux like this:
# Ah this is a tmux issue.  If there is already a tmux running which didn't have node on the path, then its window won't either!
pass_vars="PATH=$PATH NVM_PATH=$NVM_PATH NVM_BIN=$NVM_BIN"
# It used to make the window titles rather long, but now we set them below anyway.

require_check() {
	if ! env $pass_vars which "$1" >/dev/null
	then
		echo "We require '$1' to be on the PATH." >&2
		shift
		[ -n "$*" ] && echo "You could try: $*" >&2
		exit 1
	fi
}

require_check tmux      brew install tmux
require_check node      nvm install v4.4.1 ';' nvm use v4.4.1
require_check nodemon   npm install -g nodemon



cd "$(dirname "$0")"
mkdir -p logs

pass_args="$pass_args --color=always -i test"

# Start a new session
tmux new-session -s sinoserv -d "sleep 5"

# We provide different times for each server so that they don't all reload at the same time, which would be tough on the developer's machine!
# You may like to reduce the delay for the server(s) you work on, and increase the others.
cd Server
tmux new-window -t sinoserv -n 'app(server)' -d "$pass_vars nodemon -d 1  app.js                 $pass_args 2>&1 | tee ../logs/appServer.log"           # :9000
tmux new-window -t sinoserv -n clientAPI     -d "$pass_vars nodemon -d 2  clientAPIServer.js     $pass_args 2>&1 | tee ../logs/clientAPIServer.log"     # :9280
tmux new-window -t sinoserv -n paymentAPI    -d "$pass_vars nodemon -d 3  paymentAPIServer.js    $pass_args 2>&1 | tee ../logs/paymentAPIServer.log"    # :9480
tmux new-window -t sinoserv -n providerAPI   -d "$pass_vars nodemon -d 4  providerAPIServer.js   $pass_args 2>&1 | tee ../logs/providerAPIServer.log"   # :9380
tmux new-window -t sinoserv -n settlement    -d "$pass_vars PORT=8001 nodemon -d 5 ./settlementServer.js $pass_args 2>&1 | tee ../logs/settlementServer-1.log"   # :8001
#tmux new-window -t sinoserv -n settlement    -d "$pass_vars PORT=8002 nodemon -d 1 ./settlementServer.js $pass_args 2>&1 | tee ../logs/settlementServer-2.log"
#tmux new-window -t sinoserv -n settlement    -d "$pass_vars PORT=8003 nodemon -d 1 ./settlementServer.js $pass_args 2>&1 | tee ../logs/settlementServer-3.log"
tmux new-window -t sinoserv -n schedule      -d "$pass_vars nodemon -d 6  scheduleServer.js      $pass_args 2>&1 | tee ../logs/scheduleServer.log"      #
tmux new-window -t sinoserv -n message       -d "$pass_vars nodemon -d 1  messageServer.js       $pass_args 2>&1 | tee ../logs/messageServer.log"       # :9580
tmux new-window -t sinoserv -n dataMigration -d "$pass_vars nodemon -d 1  dataMigrationServer.js $pass_args 2>&1 | tee ../logs/dataMigrationServer.log" # :9680
cd ..

# The file public/js/config.js changes very often, as part of a grunt process.  We can ignore it.
# The client app does not need to restart when .jade or .css or public .js files change, because it always serves the latest versions anyway.
# It only needs to restart when app.js or routes/*.js change.
cd Client
tmux new-window -t sinoserv -n 'app(client)'  -d "$pass_vars nodemon -d 1 -i 'public/js/config.js' -w 'app.js' -w 'routes' app.js $pass_args 2>&1 | tee ../logs/clientServer.log"
cd ..

# Optional: view the session
tmux attach -t sinoserv
