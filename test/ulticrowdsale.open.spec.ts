import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCoinUnswappable__factory, UltiCrowdsale, UltiCrowdsale__factory } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { BigNumber, utils } from 'ethers'
import { CROWDSALE_SUPPLY, KYCED_WHITELIST, OPENING_TIME, Stages, stagesData, ZERO_ADDRESS } from './common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

use(solidity)

describe('UltiCrowdsale time dependent', () => {
  let deployer: SignerWithAddress
  let admin: SignerWithAddress
  let investor: SignerWithAddress
  let wallet: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  const value = utils.parseEther('1')

  let tokenFactory: UltiCoinUnswappable__factory
  let crowdsaleFactory: UltiCrowdsale__factory

  const purchaseValues = [
    utils.parseEther('0.01'),
    utils.parseEther('0.1'),
    utils.parseEther('0.25'),
    utils.parseEther('0.5'),
    utils.parseEther('1.5431655'),
    utils.parseEther('3'),
    utils.parseEther('5'),
    utils.parseEther('7.543122'),
    utils.parseEther('11'),
    utils.parseEther('21.5'),
    utils.parseEther('32.6'),
    utils.parseEther('43'),
    utils.parseEther('51'),
    utils.parseEther('99.9'),
  ]

  beforeEach(async () => {
    ;[deployer, admin, wallet, investor, purchaser, ...addrs] = await ethers.getSigners()
    tokenFactory = (await ethers.getContractFactory('UltiCoinUnswappable')) as UltiCoinUnswappable__factory
    crowdsaleFactory = (await ethers.getContractFactory('UltiCrowdsale')) as UltiCrowdsale__factory
  })

  context('once deployed and open', async function () {
    beforeEach(async function () {
      await ethers.provider.send('hardhat_reset', [])

      this.token = await tokenFactory.connect(deployer).deploy(wallet.address)
      this.crowdsale = await crowdsaleFactory.connect(admin).deploy(wallet.address, this.token.address)
      await this.token.connect(wallet).transfer(this.crowdsale.address, CROWDSALE_SUPPLY)

      await ethers.provider.send('evm_setNextBlockTimestamp', [OPENING_TIME])
      await ethers.provider.send('evm_mine', [])
    })

    const crowdsaleStages = [
      Stages.GuaranteedSpot,
      Stages.PrivateSale,
      Stages.Presale1,
      Stages.Presale2,
      Stages.Presale3,
      Stages.Presale4,
      Stages.Presale5,
    ]
    crowdsaleStages.forEach(function (stage) {
      context(`in ${Stages[stage]} stage`, async function () {
        const stageData = stagesData[stage]

        beforeEach(async function () {
          const beforeClosingTimestamp = Number(stageData.closeTimestamp) - Number(3600)
          await ethers.provider.send('evm_setNextBlockTimestamp', [beforeClosingTimestamp])
          await ethers.provider.send('evm_mine', [])
        })

        it(`should be in ${Stages[stage]} stage`, async function () {
          const stage = await this.crowdsale.connect(purchaser).stage()
          expect(stage).to.be.equal(stage.valueOf())
        })

        it(`should set ${stageData.bonus}% stage bonus`, async function () {
          expect(await this.crowdsale.connect(purchaser).bonus()).to.be.equal(stageData.bonus)
        })

        it(`should set ${stageData.rate} stage rate`, async function () {
          expect(await this.crowdsale.connect(purchaser).rate()).to.be.equal(stageData.rate)
        })

        it(`should set stage cap`, async function () {
          expect(await this.crowdsale.connect(purchaser).cap()).to.be.equal(stageData.cap)
        })

        context('for not whitelisted', async function () {
          const stageWhitelist = utils.keccak256(Buffer.from(stageData.whitelists?.[0] as string))
          beforeEach(async function () {
            await expect(
              await this.crowdsale.connect(admin).isWhitelisted(stageWhitelist, purchaser.address)
            ).to.be.false
            await expect(
              await this.crowdsale.connect(admin).isWhitelisted(stageWhitelist, investor.address)
            ).to.be.false
          })

          it('reverts on tokens release', async function () {
            await expect(this.crowdsale.connect(purchaser).releaseTokens(investor.address)).to.be.revertedWith(
              'UltiCrowdsale: beneficiary is not on whitelist'
            )
          })

          describe('accepting payments', function () {
            it('reverts on positive payments', async function () {
              await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: value })).to.be.revertedWith(
                `UltiCrowdsale: beneficiary is not on whitelist`
              )
            })

            it('reverts on tokens purchase', async function () {
              await expect(
                this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
              ).to.be.revertedWith(`UltiCrowdsale: beneficiary is not on whitelist`)
            })
          })
        })

        if (stageData.wrongWhitelist !== undefined && stageData.wrongWhitelist.length > 0) {
          const stageWhitelist = utils.keccak256(Buffer.from(stageData.whitelists?.[0] as string))

          stageData.wrongWhitelist?.forEach(function (wrongWhitelist) {
            const stageWrongWhitelist = utils.keccak256(Buffer.from(wrongWhitelist))
            context(`for whitelisted on ${wrongWhitelist}`, async function () {
              beforeEach(async function () {
                await this.crowdsale
                  .connect(admin)
                  .bulkAddToWhitelists([stageWrongWhitelist], [purchaser.address, investor.address])

                await expect(
                  await this.crowdsale.connect(admin).isWhitelisted(stageWrongWhitelist, investor.address)
                ).to.be.true

                await expect(
                  await this.crowdsale.connect(admin).isWhitelisted(stageWhitelist, investor.address)
                ).to.be.false
              })

              if (wrongWhitelist != KYCED_WHITELIST) {
                it('reverts on tokens release', async function () {
                  await expect(this.crowdsale.connect(purchaser).releaseTokens(investor.address)).to.be.revertedWith(
                    'UltiCrowdsale: beneficiary is not on whitelist'
                  )
                })
              }

              describe('accepting payments', function () {
                it('reverts on positive payments', async function () {
                  await expect(
                    purchaser.sendTransaction({ to: this.crowdsale.address, value: value })
                  ).to.be.revertedWith(`UltiCrowdsale: beneficiary is not on whitelist`)
                })

                it('reverts on tokens purchase', async function () {
                  await expect(
                    this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
                  ).to.be.revertedWith(`UltiCrowdsale: beneficiary is not on whitelist`)
                })
              })
            })
          })
        }

        stageData.whitelists?.forEach(function (whitelist) {
          let stagePurchaseValues: BigNumber[] = []
          purchaseValues.reduce((r, e) => {
            if (stageData.minContribution.lte(e) && stageData.maxContribution.gte(e)) r.push(e)
            return r
          }, stagePurchaseValues)
          const stageWhitelist = utils.keccak256(Buffer.from(whitelist))
          context(`for whitelisted on ${whitelist}`, async function () {
            describe('accepting payments', function () {
              const purchaseTokenAmount = value.mul(stageData.rate)
              const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
              const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

              beforeEach(async function () {
                await this.crowdsale
                  .connect(admin)
                  .bulkAddToWhitelists([stageWhitelist], [purchaser.address, investor.address])
              })

              describe('bare payments', function () {
                it('reverts on zero-valued payments', async function () {
                  await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
                    'UltiCrowdsale: the value sent is zero'
                  )
                })

                it(`reverts when value lower than minimal contribution of ${utils
                  .formatEther(stageData.minContribution)
                  .toString()} BNB`, async function () {
                  await expect(
                    purchaser.sendTransaction({
                      to: this.crowdsale.address,
                      value: stageData.minContribution.sub(1),
                    })
                  ).to.be.revertedWith('UltiCrowdsale: the value sent is insufficient for the minimal contribution')
                })

                it(`reverts when value higher than maximal contribution of ${utils
                  .formatEther(stageData.maxContribution)
                  .toString()} BNB`, async function () {
                  await expect(
                    purchaser.sendTransaction({
                      to: this.crowdsale.address,
                      value: stageData.maxContribution.add(1),
                    })
                  ).to.be.revertedWith('UltiCrowdsale: the value sent exceeds the maximum contribution')
                })

                it('reverts when value exceeds beneficiary limit', async function () {
                  await purchaser.sendTransaction({ to: this.crowdsale.address, value: stageData.minContribution })
                  await expect(
                    purchaser.sendTransaction({ to: this.crowdsale.address, value: stageData.maxContribution })
                  ).to.be.revertedWith('UltiCrowdsale: the value sent exceeds the maximum contribution')
                })

                it('should accept payments', async function () {
                  await expect(
                    purchaser.sendTransaction({ to: this.crowdsale.address, value: value })
                  ).to.not.be.reverted
                })

                it('should log purchase', async function () {
                  await expect(investor.sendTransaction({ to: this.crowdsale.address, value: value }))
                    .to.emit(this.crowdsale, 'TokensPurchased')
                    .withArgs(investor.address, investor.address, value, expectedTokenAmount)
                })
                stagePurchaseValues.forEach(function (purchaseValue) {
                  context(`value of ${utils.formatEther(purchaseValue).toString()} BNB`, async function () {
                    const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
                    const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
                    const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

                    it(`has  ${utils.formatEther(expectedTokenAmount).toString()} tokens sold`, async function () {
                      await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                      expect(await this.crowdsale.tokensSold()).to.be.eq(expectedTokenAmount)
                    })

                    it(`should assign ${utils
                      .formatEther(expectedTokenAmount)
                      .toString()} tokens to beneficiary`, async function () {
                      await investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                      expect(await this.crowdsale.tokensBought(investor.address)).to.be.equal(expectedTokenAmount)
                    })

                    it(`should forward ${utils
                      .formatEther(purchaseValue)
                      .toString()} BNB to wallet`, async function () {
                      const startBalance = await wallet.getBalance()
                      await investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                      const endBalance = await wallet.getBalance()
                      expect(endBalance).to.be.eq(startBalance.add(purchaseValue))
                    })
                  })
                })
              })

              describe('buyTokens', function () {
                it('reverts on zero-valued payments', async function () {
                  await expect(
                    this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: 0 })
                  ).to.be.revertedWith('UltiCrowdsale: the value sent is zero')
                })

                it('requires a non-null beneficiary', async function () {
                  await expect(
                    this.crowdsale.connect(purchaser).buyTokens(ZERO_ADDRESS, { value: value })
                  ).to.be.revertedWith('Crowdsale: beneficiary is the zero address')
                })
                it(`reverts when value lower than minimal contribution of ${utils
                  .formatEther(stageData.minContribution)
                  .toString()} BNB`, async function () {
                  await expect(
                    this.crowdsale
                      .connect(purchaser)
                      .buyTokens(investor.address, { value: stageData.minContribution.sub(1) })
                  ).to.be.revertedWith('UltiCrowdsale: the value sent is insufficient for the minimal contribution')
                })

                it(`reverts when value higher than maximal contribution of ${utils
                  .formatEther(stageData.maxContribution)
                  .toString()} BNB`, async function () {
                  await expect(
                    this.crowdsale
                      .connect(purchaser)
                      .buyTokens(investor.address, { value: stageData.maxContribution.add(1) })
                  ).to.be.revertedWith('UltiCrowdsale: the value sent exceeds the maximum contribution')
                })

                it('reverts when value exceeds beneficiary limit', async function () {
                  await this.crowdsale
                    .connect(purchaser)
                    .buyTokens(investor.address, { value: stageData.minContribution })
                  await expect(
                    this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: stageData.maxContribution })
                  ).to.be.revertedWith('UltiCrowdsale: the value sent exceeds the maximum contribution')
                })
                it('should accept payments', async function () {
                  await expect(
                    this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
                  ).to.not.be.reverted
                })

                it('should log purchase', async function () {
                  await expect(this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value }))
                    .to.emit(this.crowdsale, 'TokensPurchased')
                    .withArgs(purchaser.address, investor.address, value, expectedTokenAmount)
                })
                stagePurchaseValues.forEach(function (purchaseValue) {
                  context(`value of ${utils.formatEther(purchaseValue).toString()} BNB`, async function () {
                    const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
                    const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
                    const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

                    it(`has ${utils.formatEther(expectedTokenAmount).toString()} tokens sold`, async function () {
                      await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                      expect(await this.crowdsale.tokensSold()).to.be.eq(expectedTokenAmount)
                    })

                    it(`should assign ${utils
                      .formatEther(expectedTokenAmount)
                      .toString()} tokens to beneficiary`, async function () {
                      await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                      expect(await this.crowdsale.tokensBought(investor.address)).to.be.equal(expectedTokenAmount)
                    })

                    it(`should forward ${utils
                      .formatEther(purchaseValue)
                      .toString()} BNB to wallet`, async function () {
                      const startBalance = await wallet.getBalance()
                      await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                      const endBalance = await wallet.getBalance()
                      expect(endBalance).to.be.eq(startBalance.add(purchaseValue))
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
