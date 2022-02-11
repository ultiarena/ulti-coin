import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { UltiCoin__BSC } from '../typechain'
import { confirm, deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const hre: HardhatRuntimeEnvironment = require('hardhat')

async function deployUltiCoin__BSC(owner: string, pancakeRouterAddress: string) {
  const [deployer]: SignerWithAddress[] = await ethers.getSigners()

  console.log('\nContract UltiCoin__BSC will be deployed to network %s with parameters:', hre.network.name)
  console.log(' owner: %s', owner)
  console.log(' pancakeRouterAddress: %s', pancakeRouterAddress)

  if (await confirm('\nDo you want to continue [y/N]? ')) {
    console.log('Deploying contract...')

    const ultiCoin: UltiCoin__BSC = await deploy('UltiCoin__BSC', deployer, [
      owner,
      pancakeRouterAddress,
      {
        gasLimit: 10000000,
      },
    ])
    console.log('UltiCoin__BSC deployed to:', ultiCoin.address)
  } else {
    console.log('Abort')
  }
}

async function main() {
  // mainnet BSC Router Address: 0x10ED43C718714eb63d5aA57B78B54704E256024E
  // testnet BSC Router Address: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1

  const owner = '0x8595c4Ad15D51c5Bf920c249869Ec5b3250c2D4d'
  const pancakeRouterAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  await deployUltiCoin__BSC(owner, pancakeRouterAddress)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
