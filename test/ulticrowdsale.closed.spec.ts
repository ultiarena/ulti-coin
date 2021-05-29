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
  VESTING_INITIAL_PERCENT,
  VESTING_START_OFFSET,
  VESTING_CLIFF_DURATION,
  VESTING_DURATION,
} from './common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

use(solidity)

describe('UltiCrowdsale', () => {
  let admin: SignerWithAddress
  let investor: SignerWithAddress
  let other_investor: SignerWithAddress
  let wallet: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  let tokenFactory: UltiCoin__factory
  let crowdsaleFactory: UltiCrowdsale__factory

  beforeEach(async () => {
    ;[admin, wallet, investor, other_investor, purchaser, ...addrs] = await ethers.getSigners()
    tokenFactory = (await ethers.getContractFactory('UltiCoin')) as UltiCoin__factory
    crowdsaleFactory = (await ethers.getContractFactory('UltiCrowdsale')) as UltiCrowdsale__factory
  })

  context('once deployed and closed', async function () {
    const value = utils.parseEther('1')
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
      await this.token.connect(wallet).excludeAccount(this.crowdsale.address)

      await ethers.provider.send('evm_setNextBlockTimestamp', [OPENING_TIME])
      await ethers.provider.send('evm_mine', [])

      const beforeClosingTimestamp = Number(stageData.closeTimestamp) - Number(3600)
      await ethers.provider.send('evm_setNextBlockTimestamp', [beforeClosingTimestamp])
      await ethers.provider.send('evm_mine', [])

      await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
      expect(await this.crowdsale.tokensBought(investor.address)).to.be.equal(expectedTokenAmount)

      await this.crowdsale.connect(purchaser).buyTokens(other_investor.address, { value: value.mul(3) })
      expect(await this.crowdsale.tokensBought(other_investor.address)).to.be.equal(expectedTokenAmount.mul(3))

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

    it(`should return ${value.mul(4)} weiRaised`, async function () {
      expect(await this.crowdsale.connect(purchaser).weiRaised()).to.be.equal(value.mul(4))
    })

    it(`should return that hardcap is not reached`, async function () {
      expect(await this.crowdsale.connect(purchaser).hardcapReached()).to.be.false
    })

    context('release', async function () {
      describe('releaseTokens', async function () {
        it(`reverts when beneficiary has no tokens`, async function () {
          await expect(this.crowdsale.releaseTokens(purchaser.address)).to.be.revertedWith(
            'PostDeliveryVestingCrowdsale: beneficiary is not due any tokens'
          )
        })

        it(`reverts when beneficiary is ZERO_ADDRESS`, async function () {
          await expect(this.crowdsale.releaseTokens(ZERO_ADDRESS)).to.be.revertedWith(
            'PostDeliveryVestingCrowdsale: beneficiary is the zero address'
          )
        })

        describe('before cliff', async function () {
          it(`should transfer ${VESTING_INITIAL_PERCENT}% of ${utils.formatEther(expectedTokenAmount).toString()} tokens to beneficiary`, async function () {
            await this.crowdsale.releaseTokens(investor.address)
            const amount = expectedTokenAmount.mul(VESTING_INITIAL_PERCENT).div(100)
            expect(await this.token.balanceOf(investor.address)).to.be.equal(amount)
          })

          it('reverts when transfer called again', async function () {
            await this.crowdsale.releaseTokens(investor.address)
            await expect(this.crowdsale.releaseTokens(investor.address)).to.be.revertedWith(
              'PostDeliveryVestingCrowdsale: beneficiary tokens are vested'
            )
          })

          it(`should not change others balances`, async function () {
            await this.crowdsale.releaseTokens(other_investor.address)
            const otherInvestorBalance = await this.token.balanceOf(other_investor.address)
            expect(otherInvestorBalance).to.be.gt(0)
            await this.crowdsale.releaseTokens(investor.address)
            expect(await this.token.balanceOf(other_investor.address)).to.be.equal(otherInvestorBalance)
          })
        })
        const daysAfterCliff = [10, 15, 25, 30, 43, 67, 89]
        const dailyIncreasePercent = 1
        const deltaLow = BigNumber.from(999999)
        const deltaHigh = BigNumber.from(1000001)
        const deltaDenominator = BigNumber.from(1000000)
        daysAfterCliff.forEach(function (days) {
          describe(`${days} days after cliff`, async function () {
            const vestedPercentage = VESTING_INITIAL_PERCENT + days * dailyIncreasePercent
            const amountToRelease = expectedTokenAmount.mul(vestedPercentage).div(100)

            beforeEach(async function () {
              const daysSeconds = days * 24 * 60 * 60
              const newTimestamp = CLOSING_TIME + VESTING_START_OFFSET + VESTING_CLIFF_DURATION + daysSeconds
              await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp])
              await ethers.provider.send('evm_mine', [])
            })

            it(`should transfer approximately ${utils
              .formatEther(amountToRelease)
              .toString()} (${vestedPercentage}%) of ${utils.formatEther(expectedTokenAmount).toString()} tokens to beneficiary`, async function () {
              expect(await this.token.balanceOf(investor.address)).to.be.equal(0)
              await this.crowdsale.releaseTokens(investor.address)
              expect(await this.token.balanceOf(investor.address)).to.be.gte(
                amountToRelease.mul(deltaLow).div(deltaDenominator)
              )
              expect(await this.token.balanceOf(investor.address)).to.be.lte(
                amountToRelease.mul(deltaHigh).div(deltaDenominator)
              )
            })
          })
        })
        describe('after vesting ends', async function () {
          beforeEach(async function () {
            const newTimestamp = CLOSING_TIME + VESTING_START_OFFSET + VESTING_DURATION + 1
            await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp])
            await ethers.provider.send('evm_mine', [])
          })

          it('should return that vesting is ended', async function () {
            expect(await this.crowdsale.isVestingEnded()).to.be.true
          })

          it(`should transfer 100% of ${utils
            .formatEther(expectedTokenAmount)
            .toString()} tokens to beneficiary`, async function () {
            await this.crowdsale.releaseTokens(investor.address)
            expect(await this.token.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
          })

          it('reverts when all tokens released', async function () {
            await this.crowdsale.releaseTokens(investor.address)
            await expect(this.crowdsale.releaseTokens(investor.address)).to.be.revertedWith(
              'PostDeliveryVestingCrowdsale: beneficiary is not due any tokens'
            )
          })
        })
      })
    })

    context('burning', async function () {
      describe('burnNotSold', async function () {
        it(`reverts when called not by owner`, async function () {
          await expect(this.crowdsale.connect(wallet).burnNotSold()).to.be.reverted
        })

        it(`should burn all unsold crowdsale tokens`, async function () {
          const tokensSold = await this.crowdsale.tokensSold()
          expect(await this.token.balanceOf(this.crowdsale.address)).to.be.gt(tokensSold)
          await this.crowdsale.connect(admin).burnNotSold()
          expect(await this.token.balanceOf(this.crowdsale.address)).to.be.equal(tokensSold)
        })

        it(`should not change others balances`, async function () {
          await this.crowdsale.releaseTokens(investor.address)
          const investorBalance = await this.token.balanceOf(investor.address)
          expect(investorBalance).to.be.gt(0)
          await this.crowdsale.connect(admin).burnNotSold()
          expect(await this.token.balanceOf(investor.address)).to.be.equal(investorBalance)
        })
      })
    })
  })
})
