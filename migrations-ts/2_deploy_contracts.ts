const UltiToken = artifacts.require('UltiToken')

module.exports = function(deployer) {
    deployer.deploy(UltiToken)
} as Truffle.Migration

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export {}
