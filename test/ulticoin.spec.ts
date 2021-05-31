import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCoinUnswappable__factory, UltiCoin, UltiCrowdsale__factory } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { DECIMALS, MAX_SUPPLY, NAME, SYMBOL } from './common'
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
      const tokenFactory = (await ethers.getContractFactory('UltiCoinUnswappable')) as UltiCoinUnswappable__factory
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

    it(`has set total supply to ${utils.formatEther(MAX_SUPPLY)}`, async function () {
      expect(await this.token.totalSupply()).to.equal(MAX_SUPPLY)
    })

    it(`has set owner`, async function () {
      expect(await this.token.owner()).to.equal(owner.address)
    })

    it('should transfer all tokens to the owner', async function () {
      expect(await this.token.balanceOf(await this.token.owner())).to.equal(MAX_SUPPLY)
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
        const ownerBalance = BigNumber.from(MAX_SUPPLY)

        it('should decrease owner balance', async function () {
          await this.token.connect(owner).burn(burnAmount)
          expect(await this.token.connect(owner).balanceOf(owner.address)).to.equal(ownerBalance.sub(burnAmount))
        })

        it('should decrease total supply', async function () {
          await this.token.connect(owner).burn(burnAmount)
          expect(await this.token.connect(owner).totalSupply()).to.equal(BigNumber.from(MAX_SUPPLY).sub(burnAmount))
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
            'ERC20: burn amount exceeds balance'
          )
        })
      })
    })
  })
})
