# ULTI Coin contracts



[![Lint](https://github.com/ultiarena/ulti-contracts/actions/workflows/lint.yml/badge.svg)](https://github.com/ultiarena/ulti-contracts/actions/workflows/lint.yml)
[![Tests](https://github.com/ultiarena/ulti-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/ultiarena/ulti-contracts/actions/workflows/tests.yml)

## Contracts Audits

- [UltiCoin by solidity.finance](https://solidity.finance/audits/Ulticoin/)

## Usage

Format files:
- `yarn format`

Lint files:
- `yarn lint`

Compile files:
- `yarn compile`

Run tests:
- `yarn test`
- `yarn test test/crowdsale/crowdsale.spec.ts`

Deploy - choose network nad put your mnemonic to `.secrets.json`:
- `yarn coin-deploy-testnet`
- `yarn coin-deploy-kovan`
- `yarn coin-deploy-mainnet`
- `yarn crowdsale-deploy-testnet`
- `yarn crowdsale-deploy-kovan`
- `yarn crowdsale-deploy-mainnet`

Verify - choose network:
- `yarn verify-testnet CONTRACT_ADDRESS PARAM1 PARAM2...`
- `yarn verify-kovan CONTRACT_ADDRESS PARAM1 PARAM2...`
- `yarn verify-mainnet CONTRACT_ADDRESS PARAM1 PARAM2...`

Generate bytecode:
- `yarn coin-bytecode`
- `yarn crowdsale-bytecode`
