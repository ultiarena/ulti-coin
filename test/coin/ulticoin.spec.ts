import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCoinNoLiquify__factory, UltiCoinNoLiquify } from '../../typechain'
import { solidity } from 'ethereum-waffle'
import { DECIMALS, INITIAL_SUPPLY, NAME, SYMBOL } from '../common'
import { BigNumber, utils } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'

use(solidity)

describe('UltiCoin', () => {
  let deployer: SignerWithAddress
  let owner: SignerWithAddress
  let recipient: SignerWithAddress
  let wallet: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  context('once deployed', async function () {
    beforeEach(async function () {
      ;[deployer, owner, wallet, recipient, purchaser, ...addrs] = await ethers.getSigners()
      const tokenFactory = (await ethers.getContractFactory('UltiCoinNoLiquify')) as UltiCoinNoLiquify__factory
      this.token = await tokenFactory.connect(deployer).deploy(owner.address)
    })

    it(`has set name to ${NAME}`, async function () {
      expect(await this.token.name()).to.equal(NAME)
    })

    it(`has set symbol to ${SYMBOL}`, async function () {
      expect(await this.token.symbol()).to.equal(SYMBOL)
    })

    it(`has set decimals to ${DECIMALS}`, async function () {
      expect(await this.token.decimals()).to.equal(DECIMALS)
    })

    it(`has set total supply to ${utils.formatEther(INITIAL_SUPPLY)}`, async function () {
      expect(await this.token.totalSupply()).to.equal(INITIAL_SUPPLY)
    })

    it(`has set owner`, async function () {
      expect(await this.token.owner()).to.equal(owner.address)
    })

    it('should transfer all tokens to the owner', async function () {
      expect(await this.token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY)
    })

    it('should exclude itself from the fee', async function () {
      expect(await this.token.isExcludedFromFee(this.token.address)).to.be.true
    })

    it('should exclude owner from the fee', async function () {
      expect(await this.token.isExcludedFromFee(await this.token.owner())).to.be.true
    })

    context('burning tokens', async function () {
      describe('burn', function () {
        const burnAmount = parseEther('50')
        const ownerBalance = BigNumber.from(INITIAL_SUPPLY)

        it('should decrease owner balance', async function () {
          await this.token.connect(owner).burn(burnAmount)
          expect(await this.token.connect(owner).balanceOf(owner.address)).to.equal(ownerBalance.sub(burnAmount))
        })

        it('should decrease total supply', async function () {
          await this.token.connect(owner).burn(burnAmount)
          expect(await this.token.connect(owner).totalSupply()).to.equal(BigNumber.from(INITIAL_SUPPLY).sub(burnAmount))
        })

        it('should decrease not excluded address tokens', async function () {
          await this.token.connect(owner).transfer(recipient.address, burnAmount)
          expect(await this.token.balanceOf(recipient.address)).to.equal(burnAmount)
          await this.token.connect(recipient).burn(burnAmount.sub(parseEther('1.23')))
          expect(await this.token.balanceOf(recipient.address)).to.equal(parseEther('1.23'))
        })

        it('should not change other balances', async function () {
          await this.token.connect(owner).transfer(recipient.address, burnAmount)
          expect(await this.token.balanceOf(recipient.address)).to.equal(burnAmount)

          const _burnAmount = burnAmount.sub(parseEther('1.23'))
          await this.token.connect(recipient).burn(_burnAmount)
          expect(await this.token.balanceOf(owner.address)).to.equal(ownerBalance.sub(burnAmount))
        })

        it('reverts on amount exceeding balance', async function () {
          await this.token.connect(owner).transfer(recipient.address, burnAmount)
          expect(await this.token.balanceOf(recipient.address)).to.equal(burnAmount)
          await expect(this.token.connect(recipient).burn(burnAmount.add(1))).to.be.revertedWith(
            'Burn amount exceeds balance'
          )
        })
      })
    })

    context('reflecting tokens', async function () {
      describe('reflect', function () {
        const transferAmount = parseEther('50')
        const reflectAmount = parseEther('1')
        const initialSupply = BigNumber.from(INITIAL_SUPPLY)

        it('should not decrease total supply', async function () {
          await this.token.connect(owner).reflect(reflectAmount)
          expect(await this.token.connect(owner).totalSupply()).to.equal(initialSupply)
        })

        it('should not decrease owner balance when one holder', async function () {
          await this.token.connect(owner).reflect(reflectAmount)
          expect(await this.token.connect(owner).balanceOf(owner.address)).to.equal(initialSupply)
        })

        it('should decrease owner balance when other holders', async function () {
          await this.token.connect(owner).transfer(recipient.address, transferAmount)
          expect(await this.token.balanceOf(recipient.address)).to.equal(transferAmount)

          await this.token.connect(owner).reflect(reflectAmount)
          const recipientBalance = await this.token.connect(owner).balanceOf(recipient.address)
          const ownerBalance = await this.token.connect(owner).balanceOf(owner.address)

          expect(recipientBalance).to.be.gt(transferAmount)
          expect(ownerBalance).to.be.gt(ownerBalance.sub(transferAmount).sub(reflectAmount))

          const delta = BigNumber.from(1)
          expect(ownerBalance.add(recipientBalance)).to.be.gte(initialSupply.sub(delta))
        })

        it('should decrease not excluded address tokens', async function () {
          await this.token.connect(owner).transfer(recipient.address, transferAmount)
          expect(await this.token.balanceOf(recipient.address)).to.equal(transferAmount)

          await this.token.connect(recipient).reflect(reflectAmount)
          expect(await this.token.balanceOf(recipient.address)).to.be.gt(transferAmount.sub(reflectAmount))
          expect(await this.token.balanceOf(recipient.address)).to.be.lt(transferAmount)
        })

        it('should change other balances', async function () {
          const ownerBalance = BigNumber.from(INITIAL_SUPPLY)
          await this.token.connect(owner).transfer(recipient.address, transferAmount)
          expect(await this.token.balanceOf(recipient.address)).to.equal(transferAmount)

          await this.token.connect(recipient).reflect(reflectAmount)
          expect(await this.token.balanceOf(owner.address)).to.be.gt(ownerBalance.sub(transferAmount))
          expect(await this.token.balanceOf(recipient.address)).to.be.gt(transferAmount.sub(reflectAmount))
        })

        it('reverts on amount exceeding balance', async function () {
          await this.token.connect(owner).transfer(recipient.address, transferAmount)
          expect(await this.token.balanceOf(recipient.address)).to.equal(transferAmount)
          await expect(this.token.connect(recipient).reflect(transferAmount.add(1))).to.be.revertedWith(
            'Reflect amount exceeds sender balance'
          )
        })

        it('reverts when called by excluded address', async function () {
          await this.token.connect(owner).transfer(recipient.address, transferAmount)
          await this.token.connect(owner).setRewardExclusion(recipient.address, true)
          await expect(this.token.connect(recipient).reflect(transferAmount)).to.be.revertedWith(
            'Reflect from excluded address'
          )
        })
      })
    })
  })
})
