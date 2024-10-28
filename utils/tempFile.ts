import fs from 'fs';

export const readTempFile = (): Buffer | null => {
	const dirPathIndex = process.argv.indexOf('--dir');
	const dirValue = process.argv[dirPathIndex + 1];

	const rdbFile = fs.readdirSync(dirValue);

	if (!rdbFile) {
		return null;
	}

	const fileContent = fs.readFileSync(`${dirValue}/${rdbFile[0]}`);

	return fileContent;
};
