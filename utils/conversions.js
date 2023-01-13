module.exports.BNToFloat = (BN, decimals = 18) => parseInt(BN) / 10 ** decimals;

module.exports.to18Decimals = (num) => (num * 10 ** 18).toString();

module.exports.stringToFloat = (str) => parseFloat(str) / 10 ** 18;
