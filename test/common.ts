import { Decimal } from 'decimal.js'
import { BigNumber, BigNumberish, utils } from 'ethers'

export function formatTokenAmount(num: BigNumberish): string {
  return new Decimal(num.toString()).dividedBy(new Decimal(10).pow(18)).toPrecision(5)
}

export function toWei(num: BigNumberish): BigNumberish {
  return BigNumber.from(num).mul(BigNumber.from(10).pow(BigNumber.from(18)))
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/* UltiCoin consts */

const TOKEN_SUPPLY = toWei(BigNumber.from(40000000000))

/* Crowdsale consts */

enum Stages {
  Inactive,
  FirstHundred,
  PrivateSale,
  Presale1,
  Presale2,
  Presale3,
  Presale4,
  Presale5,
}

const OPENING_TIME = 1623427200
const CLOSING_TIME = 1630771200
const FIRST_HUNDRED_WHITELIST = 'FIRST_HUNDRED_WHITELIST'
const PRIVATE_SALE_WHITELIST = 'PRIVATE_SALE_WHITELIST'

const MINIMAL_CONTRIBUTION = utils.parseEther('0.5')
const MAXIMAL_CONTRIBUTION = utils.parseEther('5')

type StageData = {
  closeTimestamp: BigNumberish
  rate: BigNumberish
  bonus: BigNumberish
  cap: BigNumberish
  startCap: BigNumberish
  whitelists?: string[]
  wrongWhitelist?: string
}

const stagesData: StageData[] = [
  {
    closeTimestamp: 0,
    rate: 0,
    bonus: 0,
    cap: 0,
    startCap: 0,
  },
  {
    closeTimestamp: 1623513600,
    rate: 5263157,
    bonus: 30,
    cap: utils.parseEther('2500'),
    startCap: 0,
    whitelists: [FIRST_HUNDRED_WHITELIST],
    wrongWhitelist: PRIVATE_SALE_WHITELIST,
  },
  {
    closeTimestamp: 1624723200,
    rate: 5263157,
    bonus: 30,
    cap: utils.parseEther('2500'),
    startCap: 0,
    whitelists: [FIRST_HUNDRED_WHITELIST, PRIVATE_SALE_WHITELIST],
  },
]

export {
  stagesData,
  ZERO_ADDRESS,
  Stages,
  OPENING_TIME,
  CLOSING_TIME,
  FIRST_HUNDRED_WHITELIST,
  PRIVATE_SALE_WHITELIST,
  TOKEN_SUPPLY,
  MINIMAL_CONTRIBUTION,
  MAXIMAL_CONTRIBUTION,
}
