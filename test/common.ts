import { Decimal } from 'decimal.js'
import { BigNumber, BigNumberish } from 'ethers'

export function formatTokenAmount(num: BigNumberish): string {
  return new Decimal(num.toString()).dividedBy(new Decimal(10).pow(18)).toPrecision(5)
}

export function toWei(num: BigNumberish): BigNumberish {
  return BigNumber.from(num).mul(BigNumber.from(10).pow(BigNumber.from(18)))
}

export function toEther(num: BigNumberish): BigNumberish {
  return BigNumber.from(num).div(BigNumber.from(10).pow(BigNumber.from(18)))
}

export function missing_role(account: string, role: string): string {
  return 'AccessControl: account ' + account.toLowerCase() + ' is missing role ' + role.toLowerCase()
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/* UltiCoin consts */

const MAX_SUPPLY = toWei(BigNumber.from(250000000000))
const INITIAL_SUPPLY = toWei(BigNumber.from(250000000000))

const NAME = 'ULTI Coin'
const SYMBOL = 'ULTI'
const DECIMALS = 18

export { MAX_SUPPLY, INITIAL_SUPPLY, ZERO_ADDRESS, NAME, SYMBOL, DECIMALS }
