export abstract class Encoder {
	static simpleString(data: string): string {
		return `+${data}\r\n`;
	}

	static bulkString(data: string | null): string {
		if (data === null) {
			return '$-1\r\n';
		}
		return `$${data.length}\r\n${data}\r\n`;
	}

	static respArray(data: string[]): string {
		const arrayLength = data.length;
		const array = data.map((element) => {
			return `${Encoder.bulkString(element)}`;
		});

		return `*${arrayLength}\r\n${array.join('')}`;
	}
}
