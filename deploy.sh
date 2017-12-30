#!/bin/bash
rsync -vzr --delete --exclude '.gitignore' --exclude 'node_modules' --exclude '.git' --exclude '.DS_Store' --exclude 'test' --exclude '.nyc_output' ./ pi@10.0.0.96:laundry