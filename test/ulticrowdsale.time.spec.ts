import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCrowdsale__factory, UltiCoin__factory, UltiCrowdsale } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { utils } from 'ethers'
import {
  stagesData,
  MAXIMAL_CONTRIBUTION,
  MINIMAL_CONTRIBUTION,
  OPENING_TIME,
  Stages,
  CROWDSALE_SUPPLY,
  ZERO_ADDRESS,
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
      context(`and in ${Stages[stage]} stage`, async function () {
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

        it(`should set stage bonus`, async function () {
          expect(await this.crowdsale.connect(purchaser).bonus()).to.be.equal(stageData.bonus)
        })

        it(`should set stage rate`, async function () {
          expect(await this.crowdsale.connect(purchaser).rate()).to.be.equal(stageData.rate)
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

          it('reverts on tokens withdrawal', async function () {
            await expect(this.crowdsale.connect(purchaser).withdrawTokens(investor.address)).to.be.revertedWith(
              'PostDeliveryCrowdsale: not closed'
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

            it('reverts on tokens withdrawal', async function () {
              await expect(this.crowdsale.connect(purchaser).withdrawTokens(investor.address)).to.be.revertedWith(
                'PostDeliveryCrowdsale: not closed'
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
              const purchaseValue = utils.parseEther('3')
              const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
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
                    purchaser.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                  ).to.not.be.reverted
                })

                it('should log purchase', async function () {
                  await expect(investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue }))
                    .to.emit(this.crowdsale, 'TokensPurchased')
                    .withArgs(investor.address, investor.address, purchaseValue, expectedTokenAmount)
                })

                it('should assign tokens to sender', async function () {
                  await investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                  expect(await this.crowdsale.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
                })

                it('should forward funds to wallet', async function () {
                  const startBalance = await wallet.getBalance()
                  await investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                  const endBalance = await wallet.getBalance()
                  expect(endBalance).to.be.eq(startBalance.add(purchaseValue))
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
                    this.crowdsale.connect(purchaser).buyTokens(ZERO_ADDRESS, { value: purchaseValue })
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
                    this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                  ).to.not.be.reverted
                })

                it('should log purchase', async function () {
                  await expect(this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue }))
                    .to.emit(this.crowdsale, 'TokensPurchased')
                    .withArgs(purchaser.address, investor.address, purchaseValue, expectedTokenAmount)
                })

                it('should assign tokens to beneficiary', async function () {
                  await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                  expect(await this.crowdsale.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
                })

                it('should forward funds to wallet', async function () {
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

    const preSaleStages = [Stages.Presale1, Stages.Presale2, Stages.Presale3, Stages.Presale4, Stages.Presale5]
    preSaleStages.forEach(function (stage) {
      context(`and in ${Stages[stage]} stage`, async function () {
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

        it(`should set stage bonus`, async function () {
          expect(await this.crowdsale.connect(purchaser).bonus()).to.be.equal(stageData.bonus)
        })

        it(`should set stage rate`, async function () {
          expect(await this.crowdsale.connect(purchaser).rate()).to.be.equal(stageData.rate)
        })

        context('for anyone', async function () {
          beforeEach(async function () {})

          it('reverts on tokens withdrawal', async function () {
            await expect(this.crowdsale.connect(purchaser).withdrawTokens(investor.address)).to.be.revertedWith(
              'PostDeliveryCrowdsale: not closed'
            )
          })

          describe('accepting payments', function () {
            const purchaseValues = [
              MINIMAL_CONTRIBUTION.div(2),
              MINIMAL_CONTRIBUTION,
              utils.parseEther('3'),
              MAXIMAL_CONTRIBUTION,
              MAXIMAL_CONTRIBUTION.mul(2),
            ]

            describe('bare payments', function () {
              it('reverts on zero-valued payments', async function () {
                await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
                  'Crowdsale: weiAmount is 0'
                )
              })

              purchaseValues.forEach(function (purchaseValue) {
                context(`of ${purchaseValue.toString()} value`, async function () {
                  const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
                  const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
                  const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

                  it('should accept payments', async function () {
                    await expect(
                      purchaser.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                    ).to.not.be.reverted
                  })

                  it('should log purchase', async function () {
                    await expect(investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue }))
                      .to.emit(this.crowdsale, 'TokensPurchased')
                      .withArgs(investor.address, investor.address, purchaseValue, expectedTokenAmount)
                  })

                  it('should assign tokens to sender', async function () {
                    await investor.sendTransaction({ to: this.crowdsale.address, value: purchaseValue })
                    expect(await this.crowdsale.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
                  })

                  it('should forward funds to wallet', async function () {
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

              purchaseValues.forEach(function (purchaseValue) {
                context(`of ${purchaseValue.toString()} value`, async function () {
                  const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
                  const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
                  const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

                  it('should accept payments', async function () {
                    await expect(
                      this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                    ).to.not.be.reverted
                  })

                  it('should log purchase', async function () {
                    await expect(
                      this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                    )
                      .to.emit(this.crowdsale, 'TokensPurchased')
                      .withArgs(purchaser.address, investor.address, purchaseValue, expectedTokenAmount)
                  })

                  it('should assign tokens to beneficiary', async function () {
                    await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: purchaseValue })
                    expect(await this.crowdsale.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
                  })

                  it('should forward funds to wallet', async function () {
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
