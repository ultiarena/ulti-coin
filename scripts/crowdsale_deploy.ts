import { ethers } from 'hardhat'

async function main() {
  const wallet = '0x'
  const token = '0x'

  const crowdsaleFactory = await ethers.getContractFactory('UltiCrowdsale')
  const crowdsale = await crowdsaleFactory.deploy(wallet, token)

  console.log('UltiCrowdsale deployed to:', crowdsale.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
