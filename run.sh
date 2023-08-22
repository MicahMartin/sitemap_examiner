#!/bin/bash
#
# Function to clean up and exit
cleanup() {
  echo "Cleaning up and exiting..."
  kill $redis_pid
  kill $opensearch_pid
  kill $express_pid
  kill $client_pid
  exit
}

wait_for_opensearch() {
  # opensearch takes a while to start up.
  echo "Waiting for OpenSearch to be ready..."
  until curl -s http://localhost:9200; do
    sleep 1
  done
  echo "OpenSearch is ready!"
}

cleanup_called=false
# Trap Ctrl+C to clean up and exit
trap 'if [[ "$cleanup_called" = "false" ]]; then cleanup; cleanup_called=true; fi' INT


echo "Starting OpenSearch..."
opensearch -q &
opensearch_pid=$!

wait_for_opensearch

echo "Starting Redis..."
redis-server &
redis_pid=$!

echo "Starting client server..."
cd client 
npm run dev &
client_pid=$!
cd ..

echo "Starting Express server..."
cd server 
npm start &
express_pid=$!
cd ..


echo "All processes started!"
wait
