import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Noncer } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ContractFactory } from 'ethers'
import { receiveMessageOnPort } from 'worker_threads'

const hre: HardhatRuntimeEnvironment = require('hardhat')

async function increaseNonce(address: string, nextNonce: number) {
  const [deployer]: SignerWithAddress[] = await ethers.getSigners()
  const factory: ContractFactory = await ethers.getContractFactory('Noncer', deployer)
  const noncer = await factory.attach(address)

  const currentNextNonce = await deployer.getTransactionCount()

  console.log('\nCurrent next nonce:', currentNextNonce)
  console.log('Desired next nonce:', nextNonce)

  if (currentNextNonce >= nextNonce) {
    console.log('\nCurrent next nonce has reached or has exceeded desired one!')
    return
  }

  console.log('\nIncreasing starts...')
  for (let i = currentNextNonce; i <= nextNonce; i++) {
    let receipt
    try {
      receipt = await noncer.setNonce()
    } finally {
      console.log(`Tx sent: ${receipt.hash}`)
    }
  }
}

async function main() {
  const noncer = '0x2759C0EBAd022DB57977Be73Cf4368c45B4694F4'
  const nextNonce = 7400
  await increaseNonce(noncer, nextNonce)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
