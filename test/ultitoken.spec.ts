import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCoin__factory, UltiCoin } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { DECIMALS, MAX_SUPPLY, NAME, SYMBOL } from './common'

use(solidity)

describe('UltiCoin', () => {
  let token: UltiCoin

  beforeEach(async () => {
    const tokenFactory = (await ethers.getContractFactory('UltiCoin')) as UltiCoin__factory
    token = await tokenFactory.deploy()
  })

  describe('constructor', async () => {
    it('should set name', async () => {
      expect(await token.name()).to.equal(NAME)
    })

    it('should set symbol', async () => {
      expect(await token.symbol()).to.equal(SYMBOL)
    })

    it('should set decimals', async () => {
      expect(await token.decimals()).to.equal(DECIMALS)
    })

    it('should set initial supply', async () => {
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY)
    })
  })
})
