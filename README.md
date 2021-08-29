# ULTI Coin contracts

[![Lint](https://github.com/ultiarena/ulti-contracts/actions/workflows/lint.yml/badge.svg)](https://github.com/ultiarena/ulti-contracts/actions/workflows/lint.yml)
[![Tests](https://github.com/ultiarena/ulti-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/ultiarena/ulti-contracts/actions/workflows/tests.yml)

## Deployments

- [Mainnet](https://bscscan.com/token/0x42BFE4A3E023f2C90aEBFfbd9B667599Fa38514F)
- [Testnet](https://testnet.bscscan.com/token/0x1Ed837F59efA2b69c7e91a7D1bFa06FC9C20ea09)

## Audits

- [CertiK ](https://www.certik.org/projects/ultiarena)

## Usage

Format files:
- `yarn format`

Lint files:
- `yarn lint`

Compile files:
- `yarn compile`

Run tests:
- `yarn test`

Deploy - choose network nad put your mnemonic to `.secrets.json`:
- `yarn coin-deploy-testnet`
- `yarn coin-deploy-kovan`
- `yarn coin-deploy-mainnet`

Verify - choose network:
- `yarn verify-testnet CONTRACT_ADDRESS PARAM1 PARAM2...`
- `yarn verify-kovan CONTRACT_ADDRESS PARAM1 PARAM2...`
- `yarn verify-mainnet CONTRACT_ADDRESS PARAM1 PARAM2...`

Generate bytecode:
- `yarn coin-bytecode`
