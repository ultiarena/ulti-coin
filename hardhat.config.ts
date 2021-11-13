import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'solidity-coverage'
const { mnemonic, etherscanApiKey, infuraApiKey } = require('./.secrets.json')

module.exports = {
  networks: {
    kovan: {
      url: `https://kovan.infura.io/v3/${infuraApiKey}`,
      chainId: 42,
      accounts: { mnemonic: mnemonic },
    },
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
    polygon_testnet: {
      url: `https://rpc-mumbai.maticvigil.com`,
      chainId: 80001,
      accounts: { mnemonic: mnemonic },
    },
    polygon: {
      url: 'https://rpc-mainnet.maticvigil.com',
      chainId: 137,
      accounts: { mnemonic: mnemonic },
    },
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.6',
      },
      {
        version: '0.8.10',
      },
    ],
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
