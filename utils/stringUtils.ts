type KVPair = { key: string; value: string };

export const splitByKeyValuePairs = (dbContent: string): KVPair[] => {
	let keyValuePairs: KVPair[] = [];

	const keyValuePairsEncoded = dbContent.split('00');
	console.log({ keyValuePairsEncoded });
	keyValuePairsEncoded.forEach((pair) => {
		const keyLength = parseInt(pair.slice(0, 2), 16);
		const keyBuff = pair.slice(2, keyLength * 2 + 2);
		const key = Buffer.from(keyBuff, 'hex').toString();

		const valueLength = parseInt(pair.slice(keyLength * 2 + 2, keyLength * 2 + 4), 16);
		const valueBuff = pair.slice(keyLength * 2 + 4, keyLength * 2 + 4 + valueLength * 2);
		const value = Buffer.from(valueBuff, 'hex').toString();

		keyValuePairs.push({ key, value });
	});

	return keyValuePairs;
};
