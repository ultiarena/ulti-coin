import { Decimal } from 'decimal.js'
import { BigNumber, BigNumberish, utils } from 'ethers'

export function formatTokenAmount(num: BigNumberish): string {
  return new Decimal(num.toString()).dividedBy(new Decimal(10).pow(18)).toPrecision(5)
}

export function toWei(num: BigNumberish): BigNumberish {
  return BigNumber.from(num).mul(BigNumber.from(10).pow(BigNumber.from(18)))
}

export function toEther(num: BigNumberish): BigNumberish {
  return BigNumber.from(num).div(BigNumber.from(10).pow(BigNumber.from(18)))
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/* UltiCoin consts */

const MAX_SUPPLY = toWei(BigNumber.from(250000000000))
const INITIAL_SUPPLY = toWei(BigNumber.from(160620000000))
const CROWDSALE_SUPPLY = toWei(BigNumber.from(59370000000))

const NAME = 'ULTI Coin'
const SYMBOL = 'ULTI'
const DECIMALS = 18

/* Crowdsale consts */

enum Stages {
  Inactive,
  GuaranteedSpot,
  PrivateSale,
  Presale1,
  Presale2,
  Presale3,
  Presale4,
  Presale5,
}

const OPENING_TIME = 1623427200
const CLOSING_TIME = 1631451600
const GUARANTEED_SPOT_WHITELIST = 'GUARANTEED_SPOT_WHITELIST'
const CROWDSALE_WHITELIST = 'CROWDSALE_WHITELIST'

const MINIMAL_CONTRIBUTION = utils.parseEther('0.5')
const MAXIMAL_CONTRIBUTION = utils.parseEther('5')

const VESTING_START_OFFSET = 864000 // 10 days
const VESTING_CLIFF_DURATION = 864000 // 10 days
const VESTING_DURATION = 8640000 // 100 days
const VESTING_INITIAL_PERCENT = 10

type StageData = {
  closeTimestamp: BigNumberish
  rate: BigNumberish
  bonus: BigNumberish
  cap: BigNumberish
  startCap: BigNumberish
  whitelists?: string[]
  wrongWhitelist?: string
  minContribution?: BigNumber
  maxContribution?: BigNumber
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
    whitelists: [GUARANTEED_SPOT_WHITELIST],
    wrongWhitelist: CROWDSALE_WHITELIST,
    minContribution: MINIMAL_CONTRIBUTION,
    maxContribution: MAXIMAL_CONTRIBUTION,
  },
  {
    closeTimestamp: 1624723200,
    rate: 5263157,
    bonus: 30,
    cap: utils.parseEther('2500'),
    startCap: 0,
    whitelists: [CROWDSALE_WHITELIST, GUARANTEED_SPOT_WHITELIST],
    minContribution: MINIMAL_CONTRIBUTION,
    maxContribution: MAXIMAL_CONTRIBUTION,
  },
  {
    closeTimestamp: 1625932800,
    rate: 2222222,
    bonus: 10,
    cap: utils.parseEther('3500'),
    startCap: utils.parseEther('2500'),
    whitelists: [CROWDSALE_WHITELIST, GUARANTEED_SPOT_WHITELIST],
  },
  {
    closeTimestamp: 1627142400,
    rate: 1408450,
    bonus: 5,
    cap: utils.parseEther('6000'),
    startCap: utils.parseEther('6000'),
    whitelists: [CROWDSALE_WHITELIST, GUARANTEED_SPOT_WHITELIST],
  },
  {
    closeTimestamp: 1628352000,
    rate: 1030927,
    bonus: 3,
    cap: utils.parseEther('9000'),
    startCap: utils.parseEther('12000'),
    whitelists: [CROWDSALE_WHITELIST, GUARANTEED_SPOT_WHITELIST],
  },
  {
    closeTimestamp: 1629561600,
    rate: 800000,
    bonus: 0,
    cap: utils.parseEther('12500'),
    startCap: utils.parseEther('21000'),
    whitelists: [CROWDSALE_WHITELIST, GUARANTEED_SPOT_WHITELIST],
  },
  {
    closeTimestamp: 1631451600,
    rate: 666666,
    bonus: 0,
    cap: utils.parseEther('16500'),
    startCap: utils.parseEther('33500'),
    whitelists: [CROWDSALE_WHITELIST, GUARANTEED_SPOT_WHITELIST],
  },
]

export {
  MAX_SUPPLY,
  INITIAL_SUPPLY,
  stagesData,
  ZERO_ADDRESS,
  Stages,
  OPENING_TIME,
  CLOSING_TIME,
  CROWDSALE_WHITELIST,
  GUARANTEED_SPOT_WHITELIST,
  CROWDSALE_SUPPLY,
  MINIMAL_CONTRIBUTION,
  MAXIMAL_CONTRIBUTION,
  NAME,
  SYMBOL,
  DECIMALS,
  VESTING_DURATION,
  VESTING_CLIFF_DURATION,
  VESTING_INITIAL_PERCENT,
  VESTING_START_OFFSET,
}
