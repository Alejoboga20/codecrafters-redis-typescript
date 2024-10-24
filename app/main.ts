import * as net from 'net';

const redisCommands = {
	PING: 'PING',
};

console.log('Logs from your program will appear here!');

const server: net.Server = net.createServer((connection: net.Socket) => {
	console.log('Client Connected');

	connection.on('data', (data) => {
		const parsedData = data.toString().trim();
		const messageType = parsedData[0];

		if (messageType === '*') {
			connection.write('+PONG\r\n');
		}
	});
});

server.listen(6379, '127.0.0.1');
