import * as net from 'net';

/* 
RESPO = Redis Serialization Protocol
"*2\r\n$4\r\nECHO\r\n$9\r\nraspberry"
*2\r\n -> * indicates the start of an array, 2 indicates the number of elements in the array, \r\n separates the elements
$4\r\nECHO -> $ indicates a bulk string, 4 indicates the length of the string, \r\n line break, marks the start of the string, ECHO is the string
$9\r\nraspberry -> $ indicates a bulk string, 9 indicates the length of the string, \r\n line break, marks the start of the string, raspberry is the string
*/

console.log('Logs from your program will appear here!');

const server: net.Server = net.createServer((connection: net.Socket) => {
	console.log('Client Connected');

	connection.on('data', (data) => {
		const parsedData = data.toString().trim();
		const dataParts = parsedData.split('\r\n$');

		if (dataParts[0][0] === '*') {
			const amountOfElements = parseInt(dataParts[0].split('\r\n')[0].slice(1));
			const elements = dataParts.slice(1);
			const redisCommand = elements[0].split('\r\n')[1];

			if (redisCommand === 'ECHO') {
				if (amountOfElements !== 2) {
					connection.write("-ERR wrong number of arguments for 'echo' command\r\n");
					return;
				}
				const echoString = elements[1].split('\r\n')[1];
				connection.write(`$${echoString.length}\r\n${echoString}\r\n`);
			}

			if (redisCommand === 'PING') {
				if (amountOfElements !== 1) {
					connection.write("-ERR wrong number of arguments for 'ping' command\r\n");
					return;
				}
				connection.write('+PONG\r\n');
			}
		}
	});
	connection.on('close', () => {
		connection.end();
	});
});

server.listen(6379, '127.0.0.1');
