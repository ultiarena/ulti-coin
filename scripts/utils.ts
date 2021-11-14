import readline from 'readline'
import { Contract, ContractFactory, Signer } from 'ethers'
import { ethers } from 'hardhat'

export async function deploy<Type extends Contract>(
  contractName: string,
  signer: Signer,
  parameters: Array<any>
): Promise<Type> {
  const contractFactory: ContractFactory = await ethers.getContractFactory(contractName, signer)
  const contract: Contract = await contractFactory.deploy(...parameters)
  await contract.deployed()

  return <Type>contract
}
export function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer)
    })
  )
}

export async function confirm(question: string): Promise<boolean> {
  const answer: string = await ask(question)
  return ['y', 'yes'].includes(answer.toLowerCase())
}
