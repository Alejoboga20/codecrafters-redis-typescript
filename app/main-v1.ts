import * as net from 'net';
import fs from 'fs';
import { Encoder } from '../utils/encoder';

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
				const key = elements[1].split('\r\n')[1];
				const value = keyValuePairStore.get(key);

				if (!value) {
					connection.write(Encoder.bulkString(null));
					return;
				}

				connection.write(`$${value.length}\r\n${value}\r\n`);
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
					const dirPath = '/tmp';
					const filesFolder = fs.readdirSync(dirPath);
					const rdbFileFolder = filesFolder.find((file) => file.includes('rdb'));

					if (!rdbFileFolder) {
						connection.write(Encoder.bulkString(null));
						return;
					}

					const rdbFilePath = `${dirPath}/${rdbFileFolder}`;
					const rdbFile = fs.readdirSync(rdbFilePath);

					if (!rdbFile) {
						connection.write(Encoder.bulkString(null));
						return;
					}

					const fileContent = fs.readFileSync(`${rdbFilePath}/${rdbFile}`);
					const fileString = fileContent.toString('hex');
					const dbKeys = fileString.slice(fileString.indexOf('fe'));
					const dbKeyVal = dbKeys.slice(dbKeys.indexOf('fb') + 8, dbKeys.indexOf('ff'));
					const dbKeyLen = parseInt(dbKeyVal.slice(0, 2), 16);
					const key = Buffer.from(dbKeyVal.slice(2, dbKeyLen * 2 + 2), 'hex').toString();

					connection.write(Encoder.respArray([key]));
				}
			}
		}
	});
	connection.on('close', () => {
		connection.end();
	});
});

server.listen(6379, '127.0.0.1');
