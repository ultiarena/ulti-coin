import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCrowdsale__factory, UltiCoin__factory } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { BigNumber, utils } from 'ethers'
import { toWei, ZERO_ADDRESS } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

use(solidity)

describe('UltiCrowdsale', () => {
  let investor: SignerWithAddress
  let wallet: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  const rate = BigNumber.from(1)
  const zeroRate = BigNumber.from(0)
  const value = utils.parseEther('1')
  const tokenSupply = toWei(BigNumber.from(40000000000))
  const expectedTokenAmount = rate.mul(value)

  let tokenFactory: UltiCoin__factory
  let crowdsaleFactory: UltiCrowdsale__factory

  beforeEach(async () => {
    ;[wallet, investor, purchaser, ...addrs] = await ethers.getSigners()
    tokenFactory = (await ethers.getContractFactory('UltiCoin')) as UltiCoin__factory
    crowdsaleFactory = (await ethers.getContractFactory('UltiCrowdsale')) as UltiCrowdsale__factory
  })

  it('requires a non-null token', async function () {
    await expect(crowdsaleFactory.deploy(wallet.address, ZERO_ADDRESS)).to.be.revertedWith(
      'Crowdsale: token is the zero address'
    )
  })

  context('with token', async function () {
    beforeEach(async function () {
      this.token = await tokenFactory.connect(wallet).deploy()
      expect(await this.token.balanceOf(wallet.address)).to.equal(tokenSupply)
    })

    it('requires a non-null wallet', async function () {
      await expect(crowdsaleFactory.deploy(ZERO_ADDRESS, this.token.address)).to.be.revertedWith(
        'Crowdsale: wallet is the zero address'
      )
    })

    context('once deployed', async function () {
      beforeEach(async function () {
        this.crowdsale = await crowdsaleFactory.connect(wallet).deploy(wallet.address, this.token.address)
        await this.token.transfer(this.crowdsale.address, tokenSupply)
        expect(await this.token.totalSupply()).to.equal(tokenSupply)
      })

      context('before opening', async function () {
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
          await expect(
            this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
          ).to.be.revertedWith('TimedCrowdsale: not open')
        })

        it('is in Inactive stage', async function () {
          const stage = await this.crowdsale.connect(purchaser).stage()
          expect(stage).to.be.equal(0)
        })

        it('has zero rate', async function () {
          const rate = await this.crowdsale.connect(purchaser).rate()
          expect(rate).to.be.equal(0)
        })
      })

      // describe('accepting payments', function () {
      //   describe('bare payments', function () {
      //     it('should accept payments', async function () {
      //       await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value })).to.not.be.reverted
      //     })
      //
      //     it('reverts on zero-valued payments', async function () {
      //       await expect(purchaser.sendTransaction({ to: this.crowdsale.address, value: 0 })).to.be.revertedWith(
      //         'UltiCrowdsale: weiAmount is 0'
      //       )
      //     })
      //   })
      //
      //   describe('buyTokens', function () {
      //     it('should accept payments', async function () {
      //       await expect(
      //         this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
      //       ).to.not.be.reverted
      //     })
      //
      //     it('reverts on zero-valued payments', async function () {
      //       await expect(
      //         this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: 0 })
      //       ).to.be.revertedWith('UltiCrowdsale: weiAmount is 0')
      //     })
      //
      //     it('requires a non-null beneficiary', async function () {
      //       await expect(
      //         this.crowdsale.connect(purchaser).buyTokens(ZERO_ADDRESS, { value: value })
      //       ).to.be.revertedWith('UltiCrowdsale: beneficiary is the zero address')
      //     })
      //   })
      // })
      //
      // describe('high-level purchase', function () {
      //   it('should log purchase', async function () {
      //     await expect(investor.sendTransaction({ to: this.crowdsale.address, value }))
      //       .to.emit(this.crowdsale, 'TokensPurchased')
      //       .withArgs(investor.address, investor.address, value, expectedTokenAmount)
      //   })
      //
      //   it('should assign tokens to sender', async function () {
      //     await investor.sendTransaction({ to: this.crowdsale.address, value })
      //     expect(await this.token.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
      //   })
      //
      //   it('should forward funds to wallet', async function () {
      //     const startBalance = await wallet.getBalance()
      //     await investor.sendTransaction({ to: this.crowdsale.address, value })
      //     const endBalance = await wallet.getBalance()
      //     expect(endBalance).to.be.eq(startBalance.add(value))
      //   })
      // })
      //
      // describe('low-level purchase', function () {
      //   it('should log purchase', async function () {
      //     await expect(this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value }))
      //       .to.emit(this.crowdsale, 'TokensPurchased')
      //       .withArgs(purchaser.address, investor.address, value, expectedTokenAmount)
      //   })
      //
      //   it('should assign tokens to beneficiary', async function () {
      //     await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
      //     expect(await this.token.balanceOf(investor.address)).to.be.equal(expectedTokenAmount)
      //   })
      //
      //   it('should forward funds to wallet', async function () {
      //     const startBalance = await wallet.getBalance()
      //     await this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
      //     const endBalance = await wallet.getBalance()
      //     expect(endBalance).to.be.eq(startBalance.add(value))
      //   })
      // })
    })
  })
})
