import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCrowdsale__factory, UltiCoin__factory, UltiCrowdsale } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { BigNumber, utils } from 'ethers'
import {
  stagesData,
  MAXIMAL_CONTRIBUTION,
  MINIMAL_CONTRIBUTION,
  OPENING_TIME,
  Stages,
  CROWDSALE_SUPPLY,
  ZERO_ADDRESS,
  CLOSING_TIME,
} from './common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

use(solidity)

describe('UltiCrowdsale', () => {
  let admin: SignerWithAddress
  let investor: SignerWithAddress
  let wallet: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  const value = utils.parseEther('1')

  let tokenFactory: UltiCoin__factory
  let crowdsaleFactory: UltiCrowdsale__factory

  const purchaseValues = [
    utils.parseEther('0.01'),
    utils.parseEther('0.1'),
    utils.parseEther('0.25'),
    utils.parseEther('0.5'),
    utils.parseEther('1.5431655'),
    utils.parseEther('3'),
    utils.parseEther('5'),
    utils.parseEther('10'),
  ]

  let privateSalePurchaseValues: BigNumber[] = []
  purchaseValues.reduce((r, e) => {
    if (e.gte(MINIMAL_CONTRIBUTION) && e.lte(MAXIMAL_CONTRIBUTION)) r.push(e)
    return r
  }, privateSalePurchaseValues)

  beforeEach(async () => {
    ;[admin, wallet, investor, purchaser, ...addrs] = await ethers.getSigners()
    tokenFactory = (await ethers.getContractFactory('UltiCoin')) as UltiCoin__factory
    crowdsaleFactory = (await ethers.getContractFactory('UltiCrowdsale')) as UltiCrowdsale__factory
  })

  context('once deployed and closed', async function () {
    const stage = Stages.Presale1
    const stageData = stagesData[stage]
    const purchaseTokenAmount = value.mul(stageData.rate)
    const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
    const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

    beforeEach(async function () {
      await ethers.provider.send('hardhat_reset', [])

      this.token = await tokenFactory.connect(wallet).deploy()
      this.crowdsale = await crowdsaleFactory.connect(admin).deploy(wallet.address, this.token.address)
      await this.token.transfer(this.crowdsale.address, CROWDSALE_SUPPLY)
      await this.token.connect(wallet).excludeFromFee(this.crowdsale.address)

      await ethers.provider.send('evm_setNextBlockTimestamp', [OPENING_TIME])
      await ethers.provider.send('evm_mine', [])

      const beforeClosingTimestamp = Number(stageData.closeTimestamp) - Number(3600)
      await ethers.provider.send('evm_setNextBlockTimestamp', [beforeClosingTimestamp])
      await ethers.provider.send('evm_mine', [])

      await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
      expect(await this.crowdsale.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)

      await ethers.provider.send('evm_setNextBlockTimestamp', [Number(CLOSING_TIME) + Number(1)])
      await ethers.provider.send('evm_mine', [])
    })

    it(`should be in ${Stages[Stages.Inactive]} stage`, async function () {
      const stage = await this.crowdsale.connect(purchaser).stage()
      expect(stage).to.be.equal(Stages.Inactive.valueOf())
    })

    it(`should set stage bonus`, async function () {
      expect(await this.crowdsale.connect(purchaser).bonus()).to.be.equal(0)
    })

    it(`should set stage rate`, async function () {
      expect(await this.crowdsale.connect(purchaser).rate()).to.be.equal(0)
    })

    it(`should set stage cap`, async function () {
      expect(await this.crowdsale.connect(purchaser).cap()).to.be.equal(0)
    })

    it('reverts on positive payments', async function () {
      await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: value })).to.be.revertedWith(
        'TimedCrowdsale: not open'
      )
    })

    it('reverts on zero-valued payments', async function () {
      await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
        'TimedCrowdsale: not open'
      )
    })

    it('reverts on tokens purchase', async function () {
      await expect(this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })).to.be.revertedWith(
        'TimedCrowdsale: not open'
      )
    })

    it('reverts on tokens purchase', async function () {
      await expect(this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })).to.be.revertedWith(
        'TimedCrowdsale: not open'
      )
    })

    it(`should return ${value} weiRaised`, async function () {
      expect(await this.crowdsale.connect(purchaser).weiRaised()).to.be.equal(value)
    })

    it(`should return that hardcap is not reached`, async function () {
      expect(await this.crowdsale.connect(purchaser).hardcapReached()).to.be.false
    })

    context('withdrawal', async function () {
      describe('withdrawTokens', async function () {
        it(`should transfer ${utils
          .formatEther(expectedTokenAmount)
          .toString()} tokens to beneficiary`, async function () {
          await this.crowdsale.withdrawTokens(investor.address)
          expect(await this.token.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
        })
      })
    })
  })
})
