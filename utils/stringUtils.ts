type KVPair = { key: string; value: string };

export const splitByKeyValuePairs = (tempFile: Buffer): Map<string, string> => {
	const keyValuePairs = new Map<string, string>();

	const fileString = tempFile.toString('hex');
	const db = fileString.slice(fileString.indexOf('fe'));
	const dbContent = db.slice(db.indexOf('fb') + 8, db.indexOf('ff'));

	if (dbContent.includes('fc')) {
		const currentTime = Date.now();
		const keyValuePairWithExpiration = dbContent.split('fc');
		const keyValuePairsArray = parseKeyValuePairs(keyValuePairWithExpiration);

		console.log({
			keyValuePairsArray,
			currentTime,
			currentTimeLength: currentTime.toString().length,
		});

		keyValuePairsArray
			.filter((pair) => !pair.isExpired)
			.forEach((pair) => {
				keyValuePairs.set(pair.key, pair.value);
			});

		console.log({ keyValuePairs });

		return keyValuePairs;
	}

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

export const parseKeyValuePairs = (pairs: string[]) => {
	const currentTime = new Date();

	return pairs.map((pair) => {
		const expirationTimeHex = pair.slice(0, 16);
		const result = readUint64FromHex(expirationTimeHex);
		const expirationDate = new Date(Number(result));

		const keyLength = parseInt(pair.slice(18, 20), 16);
		const keyBuff = pair.slice(20, keyLength * 2 + 20);
		const key = Buffer.from(keyBuff, 'hex').toString();

		const valuePiece = pair.slice(pair.indexOf(keyBuff) + keyBuff.length);
		const valueLenght = parseInt(valuePiece.slice(0, 2), 16);
		const valueBuff = valuePiece.slice(2, valueLenght * 2 + 2);
		const value = Buffer.from(valueBuff, 'hex').toString();

		return {
			key,
			value,
			isExpired: expirationDate < currentTime,
		};
	});
};

const readUint64FromHex = (hexString: string): bigint => {
	let result = BigInt(0);
	let shift = BigInt(0);

	for (let i = 0; i < 16; i += 2) {
		const byte = parseInt(hexString.slice(i, i + 2), 16);
		result += BigInt(byte) << shift;
		shift += BigInt(8);
	}

	return result;
};
