import * as net from 'net';

console.log('Logs from your program will appear here!');

const server: net.Server = net.createServer((connection: net.Socket) => {
	console.log('Client Connected');

	connection.on('data', () => {
		connection.write('+PONG\r\n');
	});
	connection.on('close', () => {
		connection.end();
	});
});

server.listen(6379, '127.0.0.1');
