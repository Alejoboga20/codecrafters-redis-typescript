import fs from 'fs';

export const readTempFile = (): Buffer | null => {
	const dirPath = '/tmp';
	const filesFolder = fs.readdirSync(dirPath);
	const rdbFileFolder = filesFolder.find((file) => file.includes('rdb'));

	if (!rdbFileFolder) {
		return null;
	}

	const rdbFilePath = `${dirPath}/${rdbFileFolder}`;
	const rdbFile = fs.readdirSync(rdbFilePath);

	if (!rdbFile) {
		return null;
	}

	const fileContent = fs.readFileSync(`${rdbFilePath}/${rdbFile}`);

	return fileContent;
};
