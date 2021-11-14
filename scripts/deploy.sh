#!/usr/bin/env bash
set -ex

declare script_file="deploy_${1,,}.ts"
shift

npx hardhat run "scripts/$script_file" "$@"
