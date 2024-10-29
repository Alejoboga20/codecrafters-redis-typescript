import * as net from 'net';
import fs from 'fs';
import { Encoder } from '../utils/encoder';
import { readTempFile } from '../utils/tempFile';
import { splitByKeyValuePairs } from '../utils/stringUtils';

/* 
RESPO = Redis Serialization Protocol
"*2\r\n$4\r\nECHO\r\n$9\r\nraspberry"
*2\r\n -> * indicates the start of an array, 2 indicates the number of elements in the array, \r\n separates the elements
$4\r\nECHO -> $ indicates a bulk string, 4 indicates the length of the string, \r\n line break, marks the start of the string, ECHO is the string
$9\r\nraspberry -> $ indicates a bulk string, 9 indicates the length of the string, \r\n line break, marks the start of the string, raspberry is the string
*/

console.log('Logs from your program will appear here!');

enum RedisCommands {
	PING = 'PING',
	ECHO = 'ECHO',
	SET = 'SET',
	GET = 'GET',
	CONFIG = 'CONFIG',
	KEYS = 'KEYS',
}

enum RDBParams {
	DIR = 'dir',
	DBFILENAME = 'dbfilename',
}

enum KeyPatterns {
	ALL = '*',
}

const keyValuePairStore = new Map<string, string>();

const server: net.Server = net.createServer((connection: net.Socket) => {
	console.log('Client Connected');

	connection.on('data', (data) => {
		const parsedData = data.toString().trim();
		const dataParts = parsedData.split('\r\n$');

		if (dataParts[0][0] === '*') {
			const amountOfElements = parseInt(dataParts[0].split('\r\n')[0].slice(1));
			const elements = dataParts.slice(1);
			const redisCommand = elements[0].split('\r\n')[1];

			if (redisCommand === 'PING') {
				if (amountOfElements !== 1) {
					connection.write("-ERR wrong number of arguments for 'ping' command\r\n");
					return;
				}
				connection.write('+PONG\r\n');
			}

			if (redisCommand === 'ECHO') {
				if (amountOfElements !== 2) {
					connection.write("-ERR wrong number of arguments for 'echo' command\r\n");
					return;
				}
				const echoString = elements[1].split('\r\n')[1];
				connection.write(`$${echoString.length}\r\n${echoString}\r\n`);
			}

			if (redisCommand === RedisCommands.SET) {
				if (amountOfElements < 3) {
					connection.write("-ERR wrong number of arguments for 'set' command\r\n");
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
			}

			if (redisCommand === RedisCommands.GET) {
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

				/* reading key */
				const fileString = tempFile.toString('hex');
				const dbKeys = fileString.slice(fileString.indexOf('fe'));
				const dbKeyVal = dbKeys.slice(dbKeys.indexOf('fb') + 8, dbKeys.indexOf('ff'));
				const dbKeyLen = parseInt(dbKeyVal.slice(0, 2), 16);
				const dbKeyBuf = dbKeyVal.slice(2, dbKeyLen * 2 + 2);
				const dbValueBuf = dbKeyVal.slice(dbKeyLen * 2 + 2);
				const dbKey = Buffer.from(dbKeyBuf, 'hex').toString();
				const dbValue = Buffer.from(dbValueBuf.slice(2), 'hex').toString();

				connection.write(Encoder.bulkString(dbValue));
			}

			if (redisCommand === RedisCommands.CONFIG) {
				const redisSubCommand = elements[1].split('\r\n')[1];

				if (redisSubCommand === RedisCommands.GET) {
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
				}
			}

			if (redisCommand === RedisCommands.KEYS) {
				const keysPattern = elements[1].split('\r\n')[1];

				if (keysPattern === KeyPatterns.ALL) {
					const tempFile = readTempFile();

					if (!tempFile) {
						connection.write(Encoder.bulkString(null));
						return;
					}

					const fileString = tempFile.toString('hex');
					const dbKeys = fileString.slice(fileString.indexOf('fe'));
					const dbKeyVal = dbKeys.slice(dbKeys.indexOf('fb') + 8, dbKeys.indexOf('ff'));
					const dbKeyLen = parseInt(dbKeyVal.slice(0, 2), 16);
					const key = Buffer.from(dbKeyVal.slice(2, dbKeyLen * 2 + 2), 'hex').toString();

					const dbContent = fileString.slice(fileString.indexOf('fe'));
					const dbKeyValPairs = dbContent.slice(
						dbContent.indexOf('fb') + 8,
						dbContent.indexOf('ff')
					);

					const dbKVArray = splitByKeyValuePairs(dbKeyValPairs);
					const keys = dbKVArray.map((pair) => pair.key).filter((key) => key !== '');

					connection.write(Encoder.respArray(keys));
				}
			}
		}
	});
	connection.on('close', () => {
		connection.end();
	});
});

server.listen(6379, '127.0.0.1');
