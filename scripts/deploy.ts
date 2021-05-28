import { ethers } from 'hardhat'

async function main() {
  const tokenFactory = await ethers.getContractFactory('UltiCoin')
  const token = await tokenFactory.deploy()

  console.log('UltiCoin deployed to:', token.address)

  const wallet = '0x'

  const crowdsaleFactory = await ethers.getContractFactory('UltiCrowdsale')
  const crowdsale = await crowdsaleFactory.deploy(wallet, token.address)

  console.log('UltiCrowdsale deployed to:', crowdsale.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
