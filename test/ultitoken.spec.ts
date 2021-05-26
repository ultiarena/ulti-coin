import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCoin__factory, UltiCoin } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { formatTokenAmount, INITIAL_SUPPLY, MAX_SUPPLY } from './common'

use(solidity)

describe('UltiCoin', () => {
  const name = 'UltiCoin'
  const symbol = 'ULTI'
  const decimals = 18

  let token: UltiCoin

  beforeEach(async () => {
    const tokenFactory = (await ethers.getContractFactory('UltiCoin')) as UltiCoin__factory
    token = await tokenFactory.deploy()
  })

  describe('constructor', async () => {
    it('should set name', async () => {
      expect(await token.name()).to.equal(name)
    })

    it('should set symbol', async () => {
      expect(await token.symbol()).to.equal(symbol)
    })

    it('should set decimals', async () => {
      expect(await token.decimals()).to.equal(decimals)
    })

    it('should set initial supply', async () => {
      expect(formatTokenAmount(await token.totalSupply())).to.equal(formatTokenAmount(INITIAL_SUPPLY))
    })

    it(`should set ${formatTokenAmount(MAX_SUPPLY)} cap`, async () => {
      expect(formatTokenAmount(await token.cap())).to.equal(formatTokenAmount(MAX_SUPPLY))
    })

    it('should set token to be unpaused', async () => {
      expect(await token.paused()).to.be.false
    })
  })
})
