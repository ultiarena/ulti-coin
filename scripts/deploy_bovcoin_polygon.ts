import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BoVCoin__Polygon } from '../typechain'
import { confirm, deploy } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'

const hre: HardhatRuntimeEnvironment = require('hardhat')

async function deployBoVCoin__Polygon(admin: string, accountLimit: BigNumber, transferLimit: BigNumber) {
  const [deployer]: SignerWithAddress[] = await ethers.getSigners()

  console.log('\nContract BoVCoin__Polygon will be deployed to network %s with parameters:', hre.network.name)
  console.log(' admin: %s', admin)
  console.log(' accountLimit: %s', accountLimit)
  console.log(' transferLimit: %s', transferLimit)

  if (await confirm('\nDo you want to continue [y/N]? ')) {
    console.log('Deploying contract...')

    const boVCoin: BoVCoin__Polygon = await deploy('BoVCoin__Polygon', deployer, [
      admin,
      accountLimit,
      transferLimit,
      {
        gasLimit: 5000000,
      },
    ])

    await boVCoin.deployed();

    // This solves the bug in Mumbai network where the contract address is not the real one
    const txHash = boVCoin.deployTransaction.hash;
    console.log(`Tx hash: ${txHash}\nWaiting for transaction to be mined...`);
    const txReceipt = await ethers.provider.waitForTransaction(txHash);

    console.log('BoVCoin__Polygon deployed to:', txReceipt.contractAddress)

    if (await confirm('\nDo you want to verify contract [y/N]? ')) {
      await hre.run('verify:verify', {
        address: txReceipt.contractAddress,
        constructorArguments: [admin, accountLimit, transferLimit],
      })
    }
  } else {
    console.log('Abort')
  }
}

async function main() {
  // testnet
  const admin = '0x0a98ffD63a3535F5e799e5c1DDE49Ec7A65b5fA3'
  const accountLimit = parseUnits('150000000', 18)
  const transferLimit = parseUnits('5000000', 18)

  // mainnet
  // const admin = '0x06DEedBA72Ffd0212B2A3Ef61874D4Dc9c4B2AC6'
  // const accountLimit = parseUnits('150000000', 18)
  // const transferLimit = parseUnits('5000000', 18)

  await deployBoVCoin__Polygon(admin, accountLimit, transferLimit)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
