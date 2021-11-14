import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-abi-exporter'
import 'hardhat-contract-sizer'
import 'hardhat-gas-reporter'
import 'hardhat-tracer'
import 'solidity-coverage'
import { HardhatUserConfig } from 'hardhat/config'
const { privateKey, etherscanApiKey, infuraApiKey } = require('./.secrets.json')

const config: HardhatUserConfig = {
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
  gasReporter: {
    coinmarketcap: process.env.CMC_API_KEY,
    enabled: !!process.env.REPORT_GAS,
    showTimeSpent: true,
  },
  networks: {
    kovan: {
      url: `https://kovan.infura.io/v3/${infuraApiKey}`,
      chainId: 42,
      accounts: [privateKey],
    },
    bsc_testnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      chainId: 97,
      accounts: [privateKey],
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      accounts: [privateKey],
    },
    polygon_testnet: {
      url: `https://rpc-mumbai.maticvigil.com`,
      chainId: 80001,
      accounts: [privateKey],
    },
    polygon: {
      url: 'https://rpc-mainnet.maticvigil.com',
      chainId: 137,
      accounts: [privateKey],
    },
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
      optimizer: {
        enabled: true,
      },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.8.7/metadata.html
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

export default config
