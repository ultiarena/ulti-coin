import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCoin__factory, UltiCoin } from '../../typechain'
import { solidity } from 'ethereum-waffle'
import { DECIMALS, missing_role, NAME, SYMBOL } from '../common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseUnits } from 'ethers/lib/utils'
import { utils } from 'ethers'

use(solidity)

describe('UltiCoin', () => {
  let deployer: SignerWithAddress
  let admin: SignerWithAddress
  let recipient: SignerWithAddress
  let sender: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  const MINTER_ROLE = utils.keccak256(utils.toUtf8Bytes('MINTER_ROLE'))
  const cap = parseUnits('204000000000', 18)
  const accountLimit = parseUnits('150000000', 18)
  const transferLimit = parseUnits('5000000', 18)

  context('once deployed', async function () {
    beforeEach(async function () {
      ;[deployer, admin, recipient, sender, purchaser, ...addrs] = await ethers.getSigners()
      const tokenFactory = (await ethers.getContractFactory('UltiCoin')) as UltiCoin__factory
      this.token = await tokenFactory.connect(deployer).deploy(admin.address, cap, accountLimit, transferLimit)
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

    it(`has set total supply to ZERO`, async function () {
      expect(await this.token.totalSupply()).to.equal(0)
    })

    it(`has set cap to ${utils.formatEther(cap)}`, async function () {
      expect(await this.token.cap()).to.equal(cap)
    })

    it(`has set account limit to ${utils.formatEther(accountLimit)}`, async function () {
      expect(await this.token.accountLimit()).to.equal(accountLimit)
    })

    it(`has set transfer limit to ${utils.formatEther(transferLimit)}`, async function () {
      expect(await this.token.transferLimit()).to.equal(transferLimit)
    })

    it(`has enabled minting`, async function () {
      expect(await this.token.mintingDisabled()).to.be.false
    })

    it(`has set admin as default admin`, async function () {
      expect(await this.token.hasRole(await this.token.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true
    })

    it(`has set admin as minter`, async function () {
      expect(await this.token.hasRole(MINTER_ROLE, admin.address)).to.be.true
    })

    context('minting tokens', async function () {
      const mintAmount = utils.parseEther('50')

      it('should increase recipient balance', async function () {
        await this.token.connect(admin).mint(recipient.address, mintAmount)
        expect(await this.token.balanceOf(recipient.address)).to.equal(mintAmount)
      })

      it('should increase total supply', async function () {
        await this.token.connect(admin).mint(recipient.address, mintAmount)
        expect(await this.token.totalSupply()).to.equal(mintAmount)
      })

      it('reverts on amount exceeding cap', async function () {
        await expect(this.token.connect(admin).mint(recipient.address, cap.add(1))).to.be.revertedWith('Cap exceeded')
      })

      it('reverts when called by non-minter amount exceeding cap', async function () {
        await expect(this.token.connect(deployer).mint(recipient.address, mintAmount)).to.be.revertedWith(
          missing_role(deployer.address, MINTER_ROLE)
        )
      })

      it('reverts when minting is disabled', async function () {
        await this.token.connect(admin).disableMinting()
        await expect(this.token.connect(admin).mint(recipient.address, mintAmount)).to.be.revertedWith(
          'Minting is disabled'
        )
      })
    })

    context('token transfers', async function () {
      const transferAmount = utils.parseEther('1000000')

      beforeEach(async function () {
        await this.token.connect(admin).mint(admin.address, accountLimit.mul(2))
        await this.token.connect(admin).transfer(sender.address, transferLimit.mul(2))
      })

      it('should transfer tokens to another account', async function () {
        const senderBalance = await this.token.balanceOf(sender.address)
        const recipientBalance = await this.token.balanceOf(recipient.address)
        await this.token.connect(sender).transfer(recipient.address, transferAmount)
        expect(await this.token.balanceOf(sender.address)).to.equal(senderBalance.sub(transferAmount))
        expect(await this.token.balanceOf(recipient.address)).to.equal(recipientBalance.add(transferAmount))
      })

      it('reverts when amount exceeds transfer limit', async function () {
        await expect(this.token.connect(sender).transfer(recipient.address, transferLimit.add(1))).to.be.revertedWith(
          'Transfer amount exceeds the limit'
        )
      })

      it('reverts when amount exceeds account limit', async function () {
        await expect(this.token.connect(admin).transfer(recipient.address, accountLimit.add(1))).to.be.revertedWith(
          'Recipient has reached account limit'
        )
      })

      it('reverts when account blacklisted', async function () {
        await this.token.connect(admin).setBlacklisting([recipient.address], true)
        await expect(this.token.connect(sender).transfer(recipient.address, transferAmount)).to.be.revertedWith(
          'Recipient is blacklisted'
        )
        await this.token.connect(admin).setBlacklisting([sender.address], true)
        await expect(this.token.connect(sender).transfer(recipient.address, transferAmount)).to.be.revertedWith(
          'Sender is blacklisted'
        )
      })
    })
    /*
  
  
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
      })*/
  })
})
