import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
const { mnemonic, bscApiKey } = require('./.secrets.json')

module.exports = {
  networks: {
    bsc_testnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      chainId: 97,
      accounts: { mnemonic: mnemonic },
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      accounts: { mnemonic: mnemonic },
    },
  },
  etherscan: {
    // Your API key for Binance Smart Chain
    apiKey: bscApiKey,
  },
  solidity: {
    version: '0.8.0',
    settings: {
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.7.6/metadata.html
        bytecodeHash: 'none',
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}
