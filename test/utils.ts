import { Decimal } from 'decimal.js'
import { BigNumberish } from 'ethers'

export function formatTokenAmount(num: BigNumberish): string {
  return new Decimal(num.toString()).dividedBy(new Decimal(10).pow(18)).toPrecision(5)
}
