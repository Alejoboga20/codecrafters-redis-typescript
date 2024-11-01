const DEFAULT_PORT = 6379;

export const findPort = (args: string[]): number => {
	const portFlaIndex = args.findIndex((arg) => arg === '--port');

	if (portFlaIndex === -1) {
		return DEFAULT_PORT;
	}

	return parseInt(args[portFlaIndex + 1]);
};

export const findReplicaArg = (args: string[]): boolean => {
	const replicaFlagIndex = args.findIndex((arg) => arg === '--replicaof');

	if (replicaFlagIndex === -1) {
		return false;
	}

	return true;
};
