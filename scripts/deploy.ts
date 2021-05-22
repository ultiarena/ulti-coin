import { ethers } from 'hardhat'

async function main() {
  // We get the contract to deploy
  const factory = await ethers.getContractFactory('UltiToken')
  const token = await factory.deploy()

  console.log('UltiToken deployed to:', token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
