import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { UltiCrowdsale__factory, UltiCoin__factory } from '../typechain'
import { solidity } from 'ethereum-waffle'
import { utils } from 'ethers'
import {
  GUARANTEED_SPOT_WHITELIST,
  Stages,
  CROWDSALE_SUPPLY,
  ZERO_ADDRESS,
  INITIAL_SUPPLY,
  MAX_SUPPLY,
  CLOSING_TIME,
} from './common'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { keccak256 } from 'ethers/lib/utils'

use(solidity)

describe('UltiCrowdsale', () => {
  let admin: SignerWithAddress
  let investor: SignerWithAddress
  let wallet: SignerWithAddress
  let purchaser: SignerWithAddress
  let addrs: SignerWithAddress[]

  const value = utils.parseEther('1')

  let tokenFactory: UltiCoin__factory
  let crowdsaleFactory: UltiCrowdsale__factory

  before(async () => {
    await ethers.provider.send('hardhat_reset', [])
  })

  beforeEach(async () => {
    ;[admin, wallet, investor, purchaser, ...addrs] = await ethers.getSigners()
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
      expect(await this.token.balanceOf(wallet.address)).to.equal(MAX_SUPPLY)
    })

    it('requires a non-null wallet', async function () {
      this.token = await tokenFactory.connect(wallet).deploy()
      expect(await this.token.balanceOf(wallet.address)).to.equal(MAX_SUPPLY)

      await expect(crowdsaleFactory.deploy(ZERO_ADDRESS, this.token.address)).to.be.revertedWith(
        'Crowdsale: wallet is the zero address'
      )
    })

    context('once deployed and not yet open', async function () {
      beforeEach(async function () {
        this.crowdsale = await crowdsaleFactory.connect(admin).deploy(wallet.address, this.token.address)
        await this.token.transfer(this.crowdsale.address, CROWDSALE_SUPPLY)
        expect(await this.token.balanceOf(this.crowdsale.address)).to.equal(CROWDSALE_SUPPLY)
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
        await expect(
          this.crowdsale.connect(purchaser).buyTokens(investor.address, { value: value })
        ).to.be.revertedWith('TimedCrowdsale: not open')
      })

      it('reverts on tokens withdrawal', async function () {
        await expect(this.crowdsale.connect(purchaser).withdrawTokens(investor.address)).to.be.revertedWith(
          'PostDeliveryCrowdsale: not closed'
        )
      })

      it('is in Inactive stage', async function () {
        expect(await this.crowdsale.connect(purchaser).stage()).to.be.equal(Stages.Inactive.valueOf())
      })

      it('has zero rate', async function () {
        expect(await this.crowdsale.connect(purchaser).rate()).to.be.equal(0)
      })

      it('has zero bonus', async function () {
        expect(await this.crowdsale.connect(purchaser).bonus()).to.be.equal(0)
      })

      it('has zero cap', async function () {
        expect(await this.crowdsale.connect(purchaser).cap()).to.be.equal(0)
      })

      it('has not reached hardcap', async function () {
        expect(await this.crowdsale.connect(purchaser).hardcapReached()).to.be.false
      })

      context('whitelisting', async function () {
        context('addToWhitelist', async function () {
          it('reverts when not called by admin', async function () {
            await expect(
              this.crowdsale.connect(purchaser).addToWhitelist(GUARANTEED_SPOT_WHITELIST, investor.address)
            ).to.be.revertedWith(
              `AccessControl: account ${purchaser.address.toLowerCase()} is missing role ${await this.crowdsale.DEFAULT_ADMIN_ROLE()}`
            )
          })

          it('adds address to whitelist', async function () {
            await this.crowdsale.connect(admin).addToWhitelist(GUARANTEED_SPOT_WHITELIST, investor.address)
            await expect(
              await this.crowdsale.connect(admin).isWhitelisted(GUARANTEED_SPOT_WHITELIST, investor.address)
            ).to.be.true
          })

          it('should log whitelisting', async function () {
            await expect(this.crowdsale.connect(admin).addToWhitelist(GUARANTEED_SPOT_WHITELIST, investor.address))
              .to.emit(this.crowdsale, 'WhitelistAdded')
              .withArgs(keccak256(Buffer.from(GUARANTEED_SPOT_WHITELIST)), investor.address)
          })
        })

        context('bulkAddToWhitelist', async function () {
          let addresses: string[]
          beforeEach(async function () {
            addresses = addrs.map(function (a) {
              return a.address
            })
          })

          it('reverts when not called by admin', async function () {
            await expect(
              this.crowdsale.connect(purchaser).bulkAddToWhitelist(GUARANTEED_SPOT_WHITELIST, addresses)
            ).to.be.revertedWith(
              `AccessControl: account ${purchaser.address.toLowerCase()} is missing role ${await this.crowdsale.DEFAULT_ADMIN_ROLE()}`
            )
          })

          it('adds addresses to whitelist', async function () {
            await this.crowdsale.connect(admin).bulkAddToWhitelist(GUARANTEED_SPOT_WHITELIST, addresses)
            for (let address of addresses) {
              await expect(await this.crowdsale.isWhitelisted(GUARANTEED_SPOT_WHITELIST, address)).to.be.true
            }
          })
        })

        context('removeFromWhitelist', async function () {
          beforeEach(async function () {
            await this.crowdsale.connect(admin).addToWhitelist(GUARANTEED_SPOT_WHITELIST, investor.address)
          })

          it('reverts when not called by admin', async function () {
            await expect(
              this.crowdsale.connect(purchaser).removeFromWhitelist(GUARANTEED_SPOT_WHITELIST, investor.address)
            ).to.be.revertedWith(
              `AccessControl: account ${purchaser.address.toLowerCase()} is missing role ${await this.crowdsale.DEFAULT_ADMIN_ROLE()}`
            )
          })

          it('removes address from whitelist', async function () {
            await this.crowdsale.connect(admin).removeFromWhitelist(GUARANTEED_SPOT_WHITELIST, investor.address)
            await expect(
              await this.crowdsale.connect(admin).isWhitelisted(GUARANTEED_SPOT_WHITELIST, investor.address)
            ).to.be.false
          })

          it('should log removing from whitelist', async function () {
            await expect(this.crowdsale.connect(admin).removeFromWhitelist(GUARANTEED_SPOT_WHITELIST, investor.address))
              .to.emit(this.crowdsale, 'WhitelistRemoved')
              .withArgs(keccak256(Buffer.from(GUARANTEED_SPOT_WHITELIST)), investor.address)
          })
        })
      })
    })
  })
})