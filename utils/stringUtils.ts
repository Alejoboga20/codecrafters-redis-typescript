type KVPair = { key: string; value: string };

export const splitByKeyValuePairs = (tempFile: Buffer): Map<string, string> => {
	const keyValuePairs = new Map<string, string>();

	const fileString = tempFile.toString('hex');
	const db = fileString.slice(fileString.indexOf('fe'));
	const dbContent = db.slice(db.indexOf('fb') + 8, db.indexOf('ff'));

	const keyValuePairsEncoded = dbContent.split('00');

	keyValuePairsEncoded.forEach((pair) => {
		const keyLength = parseInt(pair.slice(0, 2), 16);
		const keyBuff = pair.slice(2, keyLength * 2 + 2);
		const key = Buffer.from(keyBuff, 'hex').toString();

		const valueLength = parseInt(pair.slice(keyLength * 2 + 2, keyLength * 2 + 4), 16);
		const valueBuff = pair.slice(keyLength * 2 + 4, keyLength * 2 + 4 + valueLength * 2);
		const value = Buffer.from(valueBuff, 'hex').toString();

		keyValuePairs.set(key, value);
	});

	return keyValuePairs;
};

export const createArrayFromMap = (map: Map<string, string>): KVPair[] => {
	const array: KVPair[] = [];

	map.forEach((value, key) => {
		array.push({ key, value });
	});

	return array;
};
