const { ethers } = require('hardhat')
const { getContractAddress } = require('@ethersproject/address')

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log(`Contract addresses for ${deployer.address}:\n`)

  for (let i = 0; i < 50; i++) {
    const futureAddress = getContractAddress({
      from: deployer.address,
      nonce: i,
    })
    console.log(`${i}: ${futureAddress}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
