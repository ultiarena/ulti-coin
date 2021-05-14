const UltiToken = artifacts.require("UltiToken");

contract('UltiToken', (accounts) => {
    describe('constructor', () => {
        it('should have 0 total supply', async () => {
            const instance = await UltiToken.deployed();
            const totalSupply = await instance.totalSupply();
            assert.equal(totalSupply.toString(), "0", "total supply is not 0");
        });

        it('should have 150 * 1e9 cap', async () => {
            const instance = await UltiToken.deployed();
            const cap = await instance.cap();
            assert.equal(cap.toString(), "150000000000000000000000000000", "cap is not 150 billions");
        });
    });
});
