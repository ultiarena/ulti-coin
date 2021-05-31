import { ethers } from 'hardhat'

async function main() {
  const tokenFactory = await ethers.getContractFactory('UltiCoin')

  // mainnet BSC Router Address: 0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F
  // testnet BSC Router Address: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
  const pancakeRouterAddress = '0x'
  const token = await tokenFactory.deploy(pancakeRouterAddress, {
    gasLimit: 7600000,
  })

  console.log('UltiCoin deployed to:', token.address)

  const wallet = '0x'

  const crowdsaleFactory = await ethers.getContractFactory('UltiCrowdsale')
  const crowdsale = await crowdsaleFactory.deploy(wallet, token.address)

  console.log('UltiCrowdsale deployed to:', crowdsale.address)
}
0xdc25ef3f5b8a186998338a2ada83795fba2d695e
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
