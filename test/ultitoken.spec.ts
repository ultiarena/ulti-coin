import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiToken__factory, UltiToken } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { formatTokenAmount } from './utils'

use(solidity)

describe('UltiToken', () => {
  const name = 'UltiToken';
  const symbol = 'ULTI';
  const decimals = 18;

  const initialSupply = 40 * 1e9 * 1e18;
  const cap = 150 * 1e9 * 1e18;

  let token: UltiToken;

  beforeEach(async () => {
    const tokenFactory = (await ethers.getContractFactory('UltiToken') as UltiToken__factory)
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
      expect(formatTokenAmount(await token.totalSupply())).to.equal(formatTokenAmount(initialSupply))
    })

    it(`should set ${formatTokenAmount(cap)} cap`, async () => {
      expect(formatTokenAmount(await token.cap())).to.equal(formatTokenAmount(cap))
    })

    it('should set token to be paused', async () => {
      expect(await token.paused()).to.be.false
    })
  })
})
