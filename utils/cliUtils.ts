const DEFAULT_PORT = 6379;

export const findPort = (args: string[]): number => {
	const portFlaIndex = args.findIndex((arg) => arg === '--port');

	if (portFlaIndex === -1) {
		return DEFAULT_PORT;
	}

	return parseInt(args[portFlaIndex + 1]);
};
