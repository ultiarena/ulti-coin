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

describe('UltiCrowdsale time dependent', () => {
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

  context('once deployed and open', async function () {
    beforeEach(async function () {
      await ethers.provider.send('hardhat_reset', [])

      this.token = await tokenFactory.connect(wallet).deploy()
      this.crowdsale = await crowdsaleFactory.connect(admin).deploy(wallet.address, this.token.address)
      await this.token.transfer(this.crowdsale.address, CROWDSALE_SUPPLY)

      await ethers.provider.send('evm_setNextBlockTimestamp', [OPENING_TIME])
      await ethers.provider.send('evm_mine', [])
    })

    const privateSaleStages = [Stages.GuaranteedSpot, Stages.PrivateSale]
    privateSaleStages.forEach(function (stage) {
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
          expect(await this.crowdsale.connect(purchaser).cap()).to.be.equal(
            BigNumber.from(stageData.cap).add(stageData.startCap)
          )
        })

        context('for not whitelisted', async function () {
          beforeEach(async function () {
            await expect(
              await this.crowdsale.connect(admin).isWhitelisted(stageData.whitelists?.[0], purchaser.address)
            ).to.be.false
            await expect(
              await this.crowdsale.connect(admin).isWhitelisted(stageData.whitelists?.[0], investor.address)
            ).to.be.false
          })

          it('reverts on tokens release', async function () {
            await expect(this.crowdsale.connect(purchaser).releaseTokens(investor.address)).to.be.revertedWith(
              'PostVestingCrowdsale: not closed'
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

        if (stageData.wrongWhitelist !== undefined) {
          context(`for whitelisted on ${stageData.wrongWhitelist}`, async function () {
            beforeEach(async function () {
              await this.crowdsale
                .connect(admin)
                .bulkAddToWhitelist(stageData.wrongWhitelist, [purchaser.address, investor.address])

              await expect(
                await this.crowdsale.connect(admin).isWhitelisted(stageData.wrongWhitelist, investor.address)
              ).to.be.true

              await expect(
                await this.crowdsale.connect(admin).isWhitelisted(stageData.whitelists?.[0], investor.address)
              ).to.be.false
            })

            it('reverts on tokens release', async function () {
              await expect(this.crowdsale.connect(purchaser).releaseTokens(investor.address)).to.be.revertedWith(
                'PostVestingCrowdsale: not closed'
              )
            })

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
        }
        stageData.whitelists?.forEach(function (whitelist) {
          context(`for whitelisted on ${whitelist}`, async function () {
            describe('accepting payments', function () {
              const purchaseTokenAmount = value.mul(stageData.rate)
              const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
              const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

              beforeEach(async function () {
                await this.crowdsale.connect(admin).bulkAddToWhitelist(whitelist, [purchaser.address, investor.address])
              })

              describe('bare payments', function () {
                it('reverts on zero-valued payments', async function () {
                  await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
                    'Crowdsale: weiAmount is 0'
                  )
                })

                it('reverts when value lower than MINIMAL_CONTRIBUTION', async function () {
                  await expect(
                    purchaser.sendTransaction({ to: this.crowdsale.address, value: MINIMAL_CONTRIBUTION.sub(1) })
                  ).to.be.revertedWith('UltiCrowdsale: value sent is lower than minimal contribution')
                })

                it('reverts when value higher than MAXIMAL_CONTRIBUTION', async function () {
                  await expect(
                    purchaser.sendTransaction({ to: this.crowdsale.address, value: MAXIMAL_CONTRIBUTION.add(1) })
                  ).to.be.revertedWith('UltiCrowdsale: value sent is higher than maximal contribution')
                })

                it('reverts when value exceeds beneficiary limit', async function () {
                  await purchaser.sendTransaction({ to: this.crowdsale.address, value: MINIMAL_CONTRIBUTION })
                  await expect(
                    purchaser.sendTransaction({ to: this.crowdsale.address, value: MAXIMAL_CONTRIBUTION })
                  ).to.be.revertedWith('UltiCrowdsale: value sent exceeds beneficiary private sale contribution limit')
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
                privateSalePurchaseValues.forEach(function (purchaseValue) {
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
                  ).to.be.revertedWith('Crowdsale: weiAmount is 0')
                })

                it('requires a non-null beneficiary', async function () {
                  await expect(
                    this.crowdsale.connect(purchaser).buyTokens(ZERO_ADDRESS, { value: value })
                  ).to.be.revertedWith('Crowdsale: beneficiary is the zero address')
                })

                it('reverts when value lower than MINIMAL_CONTRIBUTION', async function () {
                  await expect(
                    this.crowdsale
                      .connect(purchaser)
                      .buyTokens(investor.address, { value: MINIMAL_CONTRIBUTION.sub(1) })
                  ).to.be.revertedWith('UltiCrowdsale: value sent is lower than minimal contribution')
                })

                it('reverts when value higher than MAXIMAL_CONTRIBUTION', async function () {
                  await expect(
                    this.crowdsale
                      .connect(purchaser)
                      .buyTokens(investor.address, { value: MAXIMAL_CONTRIBUTION.add(1) })
                  ).to.be.revertedWith('UltiCrowdsale: value sent is higher than maximal contribution')
                })

                it('reverts when value exceeds beneficiary limit', async function () {
                  await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: MINIMAL_CONTRIBUTION })
                  await expect(
                    this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: MAXIMAL_CONTRIBUTION })
                  ).to.be.revertedWith('UltiCrowdsale: value sent exceeds beneficiary private sale contribution limit')
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
                privateSalePurchaseValues.forEach(function (purchaseValue) {
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

    const preSaleStages = [Stages.Presale1, Stages.Presale2, Stages.Presale3, Stages.Presale4, Stages.Presale5]
    preSaleStages.forEach(function (stage) {
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
          expect(await this.crowdsale.connect(purchaser).cap()).to.be.equal(
            BigNumber.from(stageData.cap).add(stageData.startCap)
          )
        })

        context('for anyone', async function () {
          beforeEach(async function () {})

          it('reverts on tokens release', async function () {
            await expect(this.crowdsale.connect(purchaser).releaseTokens(investor.address)).to.be.revertedWith(
              'PostVestingCrowdsale: not closed'
            )
          })

          describe('accepting payments', function () {
            describe('bare payments', function () {
              const purchaseTokenAmount = value.mul(stageData.rate)
              const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
              const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

              it('reverts on zero-valued payments', async function () {
                await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
                  'Crowdsale: weiAmount is 0'
                )
              })

              it('should accept payments', async function () {
                await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: value })).to.not.be.reverted
              })

              it('should log purchase', async function () {
                await expect(investor.sendTransaction({ to: this.crowdsale.address, value: value }))
                  .to.emit(this.crowdsale, 'TokensPurchased')
                  .withArgs(investor.address, investor.address, value, expectedTokenAmount)
              })

              purchaseValues.forEach(function (purchaseValue) {
                context(`value of ${utils.formatEther(purchaseValue).toString()} BNB`, async function () {
                  const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
                  const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
                  const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

                  it(`should set  ${utils.formatEther(expectedTokenAmount).toString()} tokens sold`, async function () {
                    await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                    expect(await this.crowdsale.tokensSold()).to.be.eq(expectedTokenAmount)
                  })

                  it(`should assign ${utils
                    .formatEther(expectedTokenAmount)
                    .toString()} tokens to beneficiary`, async function () {
                    await investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                    expect(await this.crowdsale.tokensBought(investor.address)).to.be.equal(expectedTokenAmount)
                  })

                  it(`should forward ${utils.formatEther(purchaseValue).toString()} BNB to wallet`, async function () {
                    const startBalance = await wallet.getBalance()
                    await investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                    const endBalance = await wallet.getBalance()
                    expect(endBalance).to.be.eq(startBalance.add(purchaseValue))
                  })
                })
              })
            })

            describe('buyTokens', function () {
              const purchaseTokenAmount = value.mul(stageData.rate)
              const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
              const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

              it('reverts on zero-valued payments', async function () {
                await expect(
                  this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: 0 })
                ).to.be.revertedWith('Crowdsale: weiAmount is 0')
              })

              it('requires a non-null beneficiary', async function () {
                await expect(
                  this.crowdsale.connect(purchaser).buyTokens(ZERO_ADDRESS, { value: value })
                ).to.be.revertedWith('Crowdsale: beneficiary is the zero address')
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

              purchaseValues.forEach(function (purchaseValue) {
                context(`value of ${utils.formatEther(purchaseValue).toString()} BNB`, async function () {
                  const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
                  const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
                  const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

                  it(`should set  ${utils.formatEther(expectedTokenAmount).toString()} tokens sold`, async function () {
                    await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                    expect(await this.crowdsale.tokensSold()).to.be.eq(expectedTokenAmount)
                  })

                  it(`should assign ${utils
                    .formatEther(expectedTokenAmount)
                    .toString()} tokens to beneficiary`, async function () {
                    await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                    expect(await this.crowdsale.tokensBought(investor.address)).to.be.eq(expectedTokenAmount)
                  })

                  it(`should forward ${utils.formatEther(purchaseValue).toString()} BNB to wallet`, async function () {
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
