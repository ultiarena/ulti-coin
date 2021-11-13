import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Noncer } from '../typechain'
import { confirm, deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const hre: HardhatRuntimeEnvironment = require('hardhat')

async function deployNoncer() {
  const [deployer]: SignerWithAddress[] = await ethers.getSigners()

  console.log('\nContract Noncer will be deployed to network:', hre.network.name)

  if (await confirm('\nDo you want to continue [y/N]? ')) {
    console.log('Deploying contract...')

    const ultiCoin: Noncer = await deploy('Noncer', deployer, [])
    console.log('Noncer deployed to:', ultiCoin.address)
  } else {
    console.log('Abort')
  }
}

async function main() {
  await deployNoncer()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
