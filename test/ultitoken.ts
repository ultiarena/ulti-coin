const UltiToken = artifacts.require("UltiToken");
const {
    BN,
    constants,
    expectEvent,
    expectRevert,
} = require('@openzeppelin/test-helpers');

contract('UltiToken', (accounts) => {
    const deployer = accounts[9];
    const sender = accounts[5];
    const testAccount = accounts[2];
    const recipientAccount = accounts[1];
    const name = 'UltiToken';
    const symbol = 'ULTI';
    const decimals = 18;
    const cap = 150 * 1e9 * 1e18

    describe('constructor', () => {

        it('should set name', async () => {
            const token = await UltiToken.deployed();
            assert.equal(await token.name(), name);
        });

        it('should set symbol', async () => {
            const token = await UltiToken.deployed();
            assert.equal(await token.symbol(), symbol);
        });

        it('should set decimals', async () => {
            const token = await UltiToken.deployed();
            assert.equal((await token.decimals()).valueOf(), decimals);
        });

        it('should set 0 total supply', async () => {
            const token = await UltiToken.deployed();
            assert.equal((await token.totalSupply()).toString(), "0", "total supply is not 0");
        });

        it(`should set ${cap} cap`, async () => {
            const token = await UltiToken.deployed();
            assert.equal((await token.cap()).valueOf(), cap);
        });

        it('should set token to be paused', async () => {
            const token = await UltiToken.deployed();
            assert(await token.paused(), "token is not paused");
        });
    });
});
