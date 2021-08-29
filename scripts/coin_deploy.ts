import { ethers } from 'hardhat'

async function deploy(
  owner: string,
  pancakeRouterAddress: string
) {
  const tokenFactory = await ethers.getContractFactory('UltiCoin')
  const token = await tokenFactory.deploy(owner, pancakeRouterAddress, {
    gasLimit: 10000000,
  })
  await token.deployed()
  return token.address
}


async function main() {
  // mainnet BSC Router Address: 0x10ED43C718714eb63d5aA57B78B54704E256024E
  // testnet BSC Router Address: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
  // kovan Router Address: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

  const owner = '0x8595c4Ad15D51c5Bf920c249869Ec5b3250c2D4d'
  const pancakeRouterAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  const tokenAddress = await deploy(owner, pancakeRouterAddress)
  console.log('UltiCoin deployed to:', tokenAddress)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
