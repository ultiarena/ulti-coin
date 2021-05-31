import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCrowdsale__factory, UltiCoinUnswappable__factory, UltiCrowdsale, UltiCoinUnswappable } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { BigNumber, utils } from 'ethers'
import {
  stagesData,
  OPENING_TIME,
  Stages,
  CROWDSALE_SUPPLY,
  ZERO_ADDRESS,
  CLOSING_TIME,
  VESTING_INITIAL_PERCENT,
  VESTING_START_OFFSET,
  VESTING_CLIFF_DURATION,
  VESTING_DURATION,
  GUARANTEED_SPOT_WHITELIST,
  CROWDSALE_WHITELIST,
} from './common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

use(solidity)

describe('UltiCrowdsale', () => {
  let deployer: SignerWithAddress
  let admin: SignerWithAddress
  let investor: SignerWithAddress
  let other_investor: SignerWithAddress
  let wallet: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  let tokenFactory: UltiCoinUnswappable__factory
  let crowdsaleFactory: UltiCrowdsale__factory

  beforeEach(async () => {
    ;[deployer, admin, wallet, investor, other_investor, purchaser, ...addrs] = await ethers.getSigners()
    tokenFactory = (await ethers.getContractFactory('UltiCoinUnswappable')) as UltiCoinUnswappable__factory
    crowdsaleFactory = (await ethers.getContractFactory('UltiCrowdsale')) as UltiCrowdsale__factory
  })

  const value = utils.parseEther('1')
  const stage = Stages.Presale1
  const stageData = stagesData[stage]
  const purchaseTokenAmount = value.mul(stageData.rate)
  const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
  const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

  async function proceedCrowdsale(crowdsale: UltiCrowdsale, token: UltiCoinUnswappable) {
    await token.connect(wallet).transfer(crowdsale.address, CROWDSALE_SUPPLY)
    await token.connect(wallet).excludeFromFee(crowdsale.address)
    await token.connect(wallet).excludeFromReward(crowdsale.address)
    expect(await token.isExcludedFromReward(crowdsale.address)).to.be.true

    await ethers.provider.send('evm_setNextBlockTimestamp', [OPENING_TIME])
    await ethers.provider.send('evm_mine', [])

    const beforeClosingTimestamp = Number(stageData.closeTimestamp) - Number(3600)
    await ethers.provider.send('evm_setNextBlockTimestamp', [beforeClosingTimestamp])
    await ethers.provider.send('evm_mine', [])

    await crowdsale.connect(admin).bulkAddToWhitelist(CROWDSALE_WHITELIST, [investor.address, other_investor.address])
    await crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
    expect(await crowdsale.tokensBought(investor.address)).to.be.equal(expectedTokenAmount)

    await crowdsale.connect(purchaser).buyTokens(other_investor.address, { value: value.mul(3) })
    expect(await crowdsale.tokensBought(other_investor.address)).to.be.equal(expectedTokenAmount.mul(3))

    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(CLOSING_TIME) + Number(1)])
    await ethers.provider.send('evm_mine', [])
  }

  context('once deployed and closed', async function () {
    beforeEach(async function () {
      await ethers.provider.send('hardhat_reset', [])
      this.token = await tokenFactory.connect(deployer).deploy(wallet.address)
      this.crowdsale = await crowdsaleFactory.connect(admin).deploy(wallet.address, this.token.address)
      await proceedCrowdsale(this.crowdsale, this.token)
    })

    it(`should be in ${Stages[Stages.Inactive]} stage`, async function () {
      const stage = await this.crowdsale.stage()
      expect(stage).to.be.equal(Stages.Inactive.valueOf())
    })

    it(`has ZERO stage bonus`, async function () {
      expect(await this.crowdsale.bonus()).to.be.equal(0)
    })

    it(`has ZERO stage rate`, async function () {
      expect(await this.crowdsale.rate()).to.be.equal(0)
    })

    it(`has ZERO stage cap`, async function () {
      expect(await this.crowdsale.cap()).to.be.equal(0)
    })

    it('has ZERO tokens released', async function () {
      expect(await this.crowdsale.tokensReleased()).to.be.equal(0)
    })

    it('reverts on ZERO payments', async function () {
      await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
        'TimedCrowdsale: not open'
      )
    })

    it('reverts on positive payments', async function () {
      await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: value })).to.be.revertedWith(
        'TimedCrowdsale: not open'
      )
    })

    it('reverts on tokens purchase', async function () {
      await expect(this.crowdsale.buyTokens(investor.address, { value: value })).to.be.revertedWith(
        'TimedCrowdsale: not open'
      )
    })

    it(`has ${value.mul(4)} weiRaised`, async function () {
      expect(await this.crowdsale.weiRaised()).to.be.equal(value.mul(4))
    })

    it(`has ${utils.formatEther(expectedTokenAmount.mul(4).toString())} tokens sold`, async function () {
      expect(await this.crowdsale.tokensSold()).to.be.equal(expectedTokenAmount.mul(4))
    })

    it(`should return that hardcap is not reached`, async function () {
      expect(await this.crowdsale.hardcapReached()).to.be.false
    })

    context('release', async function () {
      describe('before cliff', async function () {
        describe('releasableAmount', async function () {
          const expectedReleaseableTokens = expectedTokenAmount.mul(VESTING_INITIAL_PERCENT).div(100)

          it(`should return that ${utils
            .formatEther(expectedReleaseableTokens)
            .toString()} is releasable`, async function () {
            expect(await this.crowdsale.releasableAmount(investor.address)).to.be.equal(expectedReleaseableTokens)
          })
        })

        describe('releaseTokens', async function () {
          it(`reverts when beneficiary has no tokens`, async function () {
            await expect(this.crowdsale.releaseTokens(purchaser.address)).to.be.revertedWith(
              'PostVestingCrowdsale: beneficiary is not due any tokens'
            )
          })

          it(`reverts on ZERO_ADDRESS beneficiary`, async function () {
            await expect(this.crowdsale.releaseTokens(ZERO_ADDRESS)).to.be.revertedWith(
              'PostVestingCrowdsale: beneficiary is the zero address'
            )
          })

          const expectedReleaseableTokens = expectedTokenAmount.mul(VESTING_INITIAL_PERCENT).div(100)

          it(`should transfer ${utils
            .formatEther(expectedReleaseableTokens)
            .toString()} (${VESTING_INITIAL_PERCENT}%) of ${utils.formatEther(expectedTokenAmount).toString()} tokens to beneficiary`, async function () {
            await this.crowdsale.releaseTokens(investor.address)
            expect(await this.token.balanceOf(investor.address)).to.be.equal(expectedReleaseableTokens)
          })

          it('reverts when transfer called again', async function () {
            await this.crowdsale.releaseTokens(investor.address)
            await expect(this.crowdsale.releaseTokens(investor.address)).to.be.revertedWith(
              'PostVestingCrowdsale: beneficiary tokens are vested'
            )
          })

          it(`should not change others balances`, async function () {
            await this.crowdsale.releaseTokens(other_investor.address)
            const otherInvestorBalance = await this.token.balanceOf(other_investor.address)
            expect(otherInvestorBalance).to.be.gt(0)
            await this.crowdsale.releaseTokens(investor.address)
            expect(await this.token.balanceOf(other_investor.address)).to.be.equal(otherInvestorBalance)
          })

          it('has ZERO tokens released', async function () {
            await this.crowdsale.releaseTokens(investor.address)
            expect(await this.crowdsale.tokensReleased()).to.be.equal(expectedReleaseableTokens)
          })
        })
      })

      const daysAfterCliff = [10, 15, 25, 30, 43, 67, 89]
      const dailyIncreasePercent = 1
      const deltaLow = BigNumber.from(999999)
      const deltaHigh = BigNumber.from(1000001)
      const deltaDenominator = BigNumber.from(1000000)

      daysAfterCliff.forEach(function (days) {
        describe(`${days} days after cliff`, async function () {
          describe('releaseTokens', async function () {
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
      })

      describe('after vesting ends', async function () {
        beforeEach(async function () {
          const newTimestamp = CLOSING_TIME + VESTING_START_OFFSET + VESTING_DURATION + 1
          await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp])
          await ethers.provider.send('evm_mine', [])
        })

        describe('releasableAmount', async function () {
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
              'PostVestingCrowdsale: beneficiary is not due any tokens'
            )
          })
        })
      })
    })

    context('burning', async function () {
      describe('burn', async function () {
        it(`reverts when called not by owner`, async function () {
          await expect(this.crowdsale.connect(wallet).burn()).to.be.reverted
        })

        it(`reverts when trying to burn unreleased tokens`, async function () {
          const balance = await this.token.balanceOf(this.crowdsale.address)
          await expect(this.crowdsale.connect(admin).burn(balance)).to.be.revertedWith(
            'UltiCrowdsale: unreleased tokens can not be burned'
          )
        })

        it(`should burn all unsold crowdsale tokens`, async function () {
          const tokensSold = await this.crowdsale.tokensSold()
          const balance = await this.token.balanceOf(this.crowdsale.address)
          expect(balance).to.be.gt(tokensSold)
          await this.crowdsale.connect(admin).burn(BigNumber.from(balance).sub(tokensSold))
          expect(await this.token.balanceOf(this.crowdsale.address)).to.be.equal(tokensSold)
        })

        it(`should not change others balances`, async function () {
          await this.crowdsale.releaseTokens(investor.address)
          const investorBalance = await this.token.balanceOf(investor.address)
          expect(investorBalance).to.be.gt(0)
          const tokensSold = await this.crowdsale.tokensSold()
          const balance = await this.token.balanceOf(this.crowdsale.address)
          await this.crowdsale.connect(admin).burn(BigNumber.from(balance).sub(tokensSold))
          expect(await this.token.balanceOf(investor.address)).to.be.equal(investorBalance)
        })
      })
    })
  })

  context('during vesting', async function () {
    before(async function () {
      await ethers.provider.send('hardhat_reset', [])
      this.token = await tokenFactory.connect(deployer).deploy(wallet.address)
      this.crowdsale = await crowdsaleFactory.connect(admin).deploy(wallet.address, this.token.address)
      await proceedCrowdsale(this.crowdsale, this.token)
    })

    async function mineToTimestamp(newTimestamp: Number) {
      await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp])
      await ethers.provider.send('evm_mine', [])
    }

    describe('sequence of actions', async function () {
      it('crowdsale has closed', async function () {
        expect(await this.crowdsale.hasClosed()).to.be.true
      })
      it(`has ${expectedTokenAmount.mul(4)} tokens sold`, async function () {
        expect(await this.crowdsale.tokensSold()).to.be.eq(expectedTokenAmount.mul(4))
      })

      describe('before cliff', async function () {
        before(async function () {
          const cliff = await this.crowdsale.vestingCliff()
          await mineToTimestamp(cliff.toNumber() - 1000)
        })

        const expectedReleasableTokens = expectedTokenAmount.mul(VESTING_INITIAL_PERCENT).div(100)
        it(`should return ${expectedReleasableTokens} releasable tokens`, async function () {
          expect(await this.crowdsale.releasableAmount(investor.address)).to.be.equal(expectedReleasableTokens)
        })

        it(`should transfer ${expectedReleasableTokens} tokens to beneficiary`, async function () {
          await this.crowdsale.releaseTokens(investor.address)
          expect(await this.token.balanceOf(investor.address)).to.be.equal(expectedReleasableTokens)
        })

        it(`should return ZERO releasable tokens`, async function () {
          expect(await this.crowdsale.releasableAmount(investor.address)).to.be.equal(0)
        })

        it(`should return ${expectedReleasableTokens} released tokens`, async function () {
          expect(await this.crowdsale.tokensReleased()).to.be.equal(expectedReleasableTokens)
        })
      })
    })
  })
})
