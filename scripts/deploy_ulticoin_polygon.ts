import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { UltiCoin } from '../typechain'
import { confirm, deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'

const hre: HardhatRuntimeEnvironment = require('hardhat')

async function deployUltiCoin(admin: string, cap: BigNumber, accountLimit: BigNumber, transferLimit: BigNumber) {
  const [deployer]: SignerWithAddress[] = await ethers.getSigners()

  console.log('\nContract BscUltiCoin will be deployed to network %s with parameters:', hre.network.name)
  console.log(' admin: %s', admin)
  console.log(' cap: %s', cap)
  console.log(' accountLimit: %s', accountLimit)
  console.log(' transferLimit: %s', transferLimit)

  if (await confirm('\nDo you want to continue [y/N]? ')) {
    console.log('Deploying contract...')

    const ultiCoin: UltiCoin = await deploy('UltiCoin', deployer, [
      admin,
      cap,
      accountLimit,
      transferLimit,
      {
        gasLimit: 5000000,
      },
    ])
    console.log('UltiCoin deployed to:', ultiCoin.address)

    if (await confirm('\nDo you want to verify contract [y/N]? ')) {
      await hre.run("verify:verify", {
        address: ultiCoin.address,
        constructorArguments: [
          admin,
          cap,
          accountLimit,
          transferLimit,
        ],
      });
    }
    
  } else {
    console.log('Abort')
  }
}

async function main() {
  // testnet
  const admin = '0x0a98ffD63a3535F5e799e5c1DDE49Ec7A65b5fA3'
  const cap = parseUnits('204000000000', 18)
  const accountLimit = parseUnits('150000000', 18)
  const transferLimit = parseUnits('5000000', 18)

  // mainnet
  // const admin = '0x8595c4Ad15D51c5Bf920c249869Ec5b3250c2D4d'
  // const cap = parseUnits('204000000000', 18)
  // const accountLimit = parseUnits('150000000', 18)
  // const transferLimit = parseUnits('5000000', 18)

  await deployUltiCoin(admin, cap, accountLimit, transferLimit)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
