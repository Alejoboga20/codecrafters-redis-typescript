import * as net from 'net';
import fs from 'fs';
import { Encoder } from '../utils/encoder';
import { readTempFile } from '../utils/tempFile';
import { createArrayFromMap, splitByKeyValuePairs } from '../utils/stringUtils';
import { findPort } from '../utils/cliUtils';
import { echo, ping, set, get, keys, getConfig } from './commands';

/* 
RESPO = Redis Serialization Protocol
"*2\r\n$4\r\nECHO\r\n$9\r\nraspberry"
*2\r\n -> * indicates the start of an array, 2 indicates the number of elements in the array, \r\n separates the elements
$4\r\nECHO -> $ indicates a bulk string, 4 indicates the length of the string, \r\n line break, marks the start of the string, ECHO is the string
$9\r\nraspberry -> $ indicates a bulk string, 9 indicates the length of the string, \r\n line break, marks the start of the string, raspberry is the string
*/

enum RedisCommands {
	PING = 'PING',
	ECHO = 'ECHO',
	SET = 'SET',
	GET = 'GET',
	CONFIG = 'CONFIG',
	KEYS = 'KEYS',
	INFO = 'INFO',
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

			if (redisCommand === RedisCommands.PING) {
				ping(amountOfElements, connection);
			}

			if (redisCommand === RedisCommands.ECHO) {
				echo(amountOfElements, elements, connection);
			}

			if (redisCommand === RedisCommands.INFO) {
				connection.write(Encoder.bulkString('role:master'));
			}

			if (redisCommand === RedisCommands.SET) {
				set(amountOfElements, elements, connection, keyValuePairStore);
			}

			if (redisCommand === RedisCommands.GET) {
				get(amountOfElements, elements, connection, keyValuePairStore);
			}

			if (redisCommand === RedisCommands.CONFIG) {
				const redisSubCommand = elements[1].split('\r\n')[1];

				if (redisSubCommand === RedisCommands.GET) {
					getConfig(amountOfElements, elements, connection);
				}
			}

			if (redisCommand === RedisCommands.KEYS) {
				keys(elements, connection);
			}
		}
	});
	connection.on('close', () => {
		connection.end();
	});
});

server.listen(findPort(process.argv), '127.0.0.1');
