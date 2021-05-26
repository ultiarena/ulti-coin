import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCrowdsale__factory, UltiCoin__factory, UltiCrowdsale } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { utils } from 'ethers'
import {
  FIRST_HUNDRED_WHITELIST,
  stagesData,
  MAXIMAL_CONTRIBUTION,
  MINIMAL_CONTRIBUTION,
  OPENING_TIME,
  PRIVATE_SALE_WHITELIST,
  Stages,
  TOKEN_SUPPLY,
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
      await this.token.transfer(this.crowdsale.address, TOKEN_SUPPLY)

      await ethers.provider.send('evm_setNextBlockTimestamp', [OPENING_TIME])
      await ethers.provider.send('evm_mine', [])
    })

    context(`and in ${Stages[Stages.FirstHundred]} stage`, async function () {
      const stage = Stages.FirstHundred
      const stageData = stagesData[stage]

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
            await this.crowdsale.connect(admin).isWhitelisted(FIRST_HUNDRED_WHITELIST, purchaser.address)
          ).to.be.false
          await expect(
            await this.crowdsale.connect(admin).isWhitelisted(FIRST_HUNDRED_WHITELIST, investor.address)
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
              'UltiCrowdsale: caller is not on FirstHundred whitelist'
            )
          })

          it('reverts on tokens purchase', async function () {
            await expect(
              this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
            ).to.be.revertedWith('UltiCrowdsale: caller is not on FirstHundred whitelist')
          })
        })
      })

      context(`for whitelisted on ${PRIVATE_SALE_WHITELIST}`, async function () {
        beforeEach(async function () {
          await this.crowdsale
            .connect(admin)
            .bulkAddToWhitelist(PRIVATE_SALE_WHITELIST, [purchaser.address, investor.address])

          await expect(
            await this.crowdsale.connect(admin).isWhitelisted(PRIVATE_SALE_WHITELIST, investor.address)
          ).to.be.true

          await expect(
            await this.crowdsale.connect(admin).isWhitelisted(FIRST_HUNDRED_WHITELIST, investor.address)
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
              'UltiCrowdsale: caller is not on FirstHundred whitelist'
            )
          })

          it('reverts on tokens purchase', async function () {
            await expect(
              this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
            ).to.be.revertedWith('UltiCrowdsale: caller is not on FirstHundred whitelist')
          })
        })
      })

      context(`for whitelisted on ${FIRST_HUNDRED_WHITELIST}`, async function () {
        describe('accepting payments', function () {
          const purchaseValue = utils.parseEther('3')
          const purchaseTokenAmount = purchaseValue.mul(stageData.rate)
          const purchaseBonus = purchaseTokenAmount.mul(stageData.bonus).div(100)
          const expectedTokenAmount = purchaseTokenAmount.add(purchaseBonus)

          beforeEach(async function () {
            await this.crowdsale
              .connect(admin)
              .bulkAddToWhitelist(FIRST_HUNDRED_WHITELIST, [purchaser.address, investor.address])
          })

          describe('bare payments', function () {
            it('reverts on zero-valued payments', async function () {
              await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
                'Crowdsale: weiAmount is 0'
              )
            })

            it('reverts when not reaching MINIMAL_CONTRIBUTION payments', async function () {
              await expect(
                purchaser.sendTransaction({ to: this.crowdsale.address, value: MINIMAL_CONTRIBUTION.sub(1) })
              ).to.be.revertedWith('UltiCrowdsale: value sent is too low or too high')
            })

            it('reverts when exceeding MAXIMAL_CONTRIBUTION payments', async function () {
              await expect(
                purchaser.sendTransaction({ to: this.crowdsale.address, value: MAXIMAL_CONTRIBUTION.add(1) })
              ).to.be.revertedWith('UltiCrowdsale: value sent is too low or too high')
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

            it('reverts when not reaching MINIMAL_CONTRIBUTION payments', async function () {
              await expect(
                this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: MINIMAL_CONTRIBUTION.sub(1) })
              ).to.be.revertedWith('UltiCrowdsale: value sent is too low or too high')
            })

            it('reverts when exceeding MAXIMAL_CONTRIBUTION payments', async function () {
              await expect(
                this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: MAXIMAL_CONTRIBUTION.add(1) })
              ).to.be.revertedWith('UltiCrowdsale: value sent is too low or too high')
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
