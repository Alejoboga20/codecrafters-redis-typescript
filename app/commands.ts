import * as net from 'net';

import { Encoder } from '../utils/encoder';
import { readTempFile } from '../utils/tempFile';
import { createArrayFromMap, splitByKeyValuePairs } from '../utils/stringUtils';
import * as fs from 'fs';
import { findReplicaArg } from '../utils/cliUtils';

export const ping = (amountOfElements: number, connection: net.Socket) => {
	if (amountOfElements !== 1) {
		connection.write(Encoder.simpleString("ERR wrong number of arguments for 'ping' command"));
		return;
	}
	connection.write(Encoder.simpleString('PONG'));
};

export const echo = (amountOfElements: number, elements: string[], connection: net.Socket) => {
	if (amountOfElements !== 2) {
		connection.write(Encoder.simpleString("ERR wrong number of arguments for 'echo' command"));
		return;
	}
	const echoString = elements[1].split('\r\n')[1];
	connection.write(Encoder.bulkString(echoString));
};

export const set = (
	amountOfElements: number,
	elements: string[],
	connection: net.Socket,
	keyValuePairStore: Map<string, string>
) => {
	if (amountOfElements < 3) {
		connection.write(Encoder.simpleString("ERR wrong number of arguments for 'set' command"));
		return;
	}
	const key = elements[1].split('\r\n')[1];
	const value = elements[2].split('\r\n')[1];
	const expirationTimeIndex = elements.findIndex((element) => element.includes('px'));
	const isExpirationTimeIncluded = expirationTimeIndex !== -1;

	if (isExpirationTimeIncluded) {
		const expirationTime = parseInt(elements[expirationTimeIndex + 1].split('\r\n')[1]);
		setTimeout(() => {
			keyValuePairStore.delete(key);
		}, expirationTime);
	}

	keyValuePairStore.set(key, value);
	connection.write(Encoder.simpleString('OK'));
};

export const get = (
	amountOfElements: number,
	elements: string[],
	connection: net.Socket,
	keyValuePairStore: Map<string, string>
) => {
	if (amountOfElements !== 2) {
		connection.write("-ERR wrong number of arguments for 'get' command\r\n");
		return;
	}
	const dirPathIndex = process.argv.indexOf('--dir');

	if (dirPathIndex === -1) {
		const key = elements[1].split('\r\n')[1];
		const value = keyValuePairStore.get(key);

		if (!value) {
			connection.write(Encoder.bulkString(null));
			return;
		}

		connection.write(Encoder.bulkString(value));
		return;
	}

	const tempFile = readTempFile();

	if (!tempFile) {
		connection.write(Encoder.bulkString(null));
		return;
	}

	const key = elements[1].split('\r\n')[1];
	const keyValuePairs = splitByKeyValuePairs(tempFile);
	const dbValue = keyValuePairs.get(key);
	console.log({ key, dbValue });

	if (!dbValue) {
		connection.write(Encoder.bulkNullString());
		return;
	}

	connection.write(Encoder.bulkString(dbValue));
};

enum KeyPatterns {
	ALL = '*',
}

enum RDBParams {
	DIR = 'dir',
	DBFILENAME = 'dbfilename',
}

export const getConfig = (amountOfElements: number, elements: string[], connection: net.Socket) => {
	if (amountOfElements < 3) {
		connection.write("-ERR wrong number of arguments for 'config get' command\r\n");
		return;
	}
	const configParam = elements[2].split('\r\n')[1];

	if (configParam === RDBParams.DIR) {
		const dirPath = '/tmp';
		const files = fs.readdirSync(dirPath);
		const rdbFile = files.find((file) => file.includes('rdb'));

		if (!rdbFile) {
			connection.write('$-1\r\n');
			return;
		}

		const rdbFilePath = `${dirPath}/${rdbFile}`;
		const response = `*2\r\n$${configParam.length}\r\n${configParam}\r\n$${rdbFilePath.length}\r\n${rdbFilePath}\r\n`;
		connection.write(response);
	}

	if (configParam === RDBParams.DBFILENAME) {
		const rdbFilePath = '/tmp/dump.rdb';
		const response = `*2\r\n$${configParam.length}\r\n${configParam}\r\n$${rdbFilePath.length}\r\n${rdbFilePath}\r\n`;
		connection.write(response);
	}
};

export const keys = (elements: string[], connection: net.Socket) => {
	const keysPattern = elements[1].split('\r\n')[1];

	if (keysPattern === KeyPatterns.ALL) {
		const tempFile = readTempFile();

		if (!tempFile) {
			connection.write(Encoder.bulkString(null));
			return;
		}

		const dbKVMap = splitByKeyValuePairs(tempFile);
		const dbKVArray = createArrayFromMap(dbKVMap);
		const keys = dbKVArray.map((pair) => pair.key).filter((key) => key !== '');

		connection.write(Encoder.respArray(keys));
	}
};

export const replicaInfo = (connection: net.Socket) => {
	const isAskingForReplicaInfo = findReplicaArg(process.argv);

	if (isAskingForReplicaInfo) {
		connection.write(Encoder.bulkString('role:slave'));
		return;
	}
	connection.write(Encoder.bulkString('role:master'));
};
