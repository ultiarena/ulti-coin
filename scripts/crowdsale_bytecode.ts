import { ethers } from 'hardhat'

async function main() {
  const crowdsaleFactory = await ethers.getContractFactory('UltiCrowdsale')

  const wallet = '0x'
  const deployTx = await crowdsaleFactory.getDeployTransaction(wallet)

  console.log('UltiCrowdsale bytecode:')
  console.log(deployTx.data)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
