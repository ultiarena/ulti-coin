import { ethers } from 'hardhat'

async function main() {
  const owner = '0x8595c4Ad15D51c5Bf920c249869Ec5b3250c2D4d'
  const pancakeRouterAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  
  const tokenFactory = await ethers.getContractFactory('UltiCoin')
  const deployTx = await tokenFactory.getDeployTransaction(owner, pancakeRouterAddress)

  console.log(`UltiCoin bytecode:\n${deployTx.data}`)
  // @ts-ignore
  console.log(`UltiCoin bytecode size: ${deployTx.data.length/2}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
