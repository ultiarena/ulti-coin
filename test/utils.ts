import { Decimal } from 'decimal.js'
import { BigNumber, BigNumberish } from 'ethers'

export function formatTokenAmount(num: BigNumberish): string {
  return new Decimal(num.toString()).dividedBy(new Decimal(10).pow(18)).toPrecision(5)
}

export function toWei(num: BigNumberish): BigNumberish {
  return BigNumber.from(num).mul(BigNumber.from(10).pow(BigNumber.from(18)))
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
