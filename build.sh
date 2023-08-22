#!/bin/bash

# Script to install dependencies and build the project

# Install node modules for frontend
echo "Installing frontend dependencies..."
cd client 
npm install
cd ..

# Install node modules & redis + open search for backend
echo "Installing backend dependencies..."
cd server 
npm install

# Install Redis
if [[ "$OSTYPE" == "linux-gnu" ]]; then
  echo "Installing Redis on nix..."
  sudo apt-get update
  sudo apt-get install redis-server
elif [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Installing Redis on macOS..."
  brew install redis
fi
# Install OpenSearch

if [[ "$OSTYPE" == "linux-gnu" ]]; then
  echo "Installing OpenSearch on nix..."
  # install opensearch deps first
  sudo apt-get update && sudo apt-get -y install lsb-release ca-certificates curl gnupg2

  # Import the public GPG key. This key is used to verify that the APT repository is signed.
  curl -o- https://artifacts.opensearch.org/publickeys/opensearch.pgp | sudo gpg --dearmor --batch --yes -o /usr/share/keyrings/opensearch-keyring

  # Create an APT repository for OpenSearch
  echo "deb [signed-by=/usr/share/keyrings/opensearch-keyring] https://artifacts.opensearch.org/releases/bundle/opensearch/2.x/apt stable main" | sudo tee /etc/apt/sources.list.d/opensearch-2.x.list

  # Verify that the repository was created successfully.
  sudo apt-get update
  # And finally install open search... 
  sudo apt-get install opensearch
elif [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Installing opensearch on macOS..."
  brew install opensearch 
fi

cd ..
echo "Project build completed!"
