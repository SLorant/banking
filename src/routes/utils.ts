import type { Transaction } from '$lib/db';

export type TransactionImport = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & {
	categoryName?: string;
};

export type ParseResult = {
	transactions: TransactionImport[];
	error?: string;
};

export type ImportOutcome = {
	/** Rows found in the CSV file (after skipping blanks / unkeyable rows). */
	parsed: number;
	/** Rows actually inserted (new transactions). */
	imported: number;
	/** Rows ignored because they already existed. */
	skipped: number;
};

export const readFileAsText = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve((e.target?.result as string) ?? '');
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
		reader.readAsText(file);
	});

export const loadTransactions = async (): Promise<Transaction[]> => {
	const response = await fetch('/api/transactions');
	if (!response.ok) throw new Error('Failed to load transactions');
	return (await response.json()) as Transaction[];
};

export const parseCSVLine = (line: string): string[] => {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			// Check for escaped quotes ("")
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++; // Skip next quote
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	// Add the last field
	result.push(current.trim());

	return result;
};

export const parseCSV = (text: string): ParseResult => {
	const lines = text.split('\n');
	if (lines.length < 2) return { transactions: [], error: 'CSV file has no data rows' };

	// Parse header
	const header = parseCSVLine(lines[0]);
	const headerNormalized = header.map((value) => value.trim().toLowerCase());
	const getIndex = (name: string) => headerNormalized.indexOf(name.toLowerCase());
	const normalizeCsvCategory = (value: string) => {
		const name = value.trim();
		if (!name) return null;
		const lower = name.toLowerCase();
		if (lower === 'uncategorised' || lower === 'uncategorized') return null;
		return name;
	};
	const withMidnightTimeIfMissing = (value: string) => {
		const text = value.trim();
		if (!text) return '';
		return text.includes(':') ? text : `${text} 00:00:00`;
	};

	// Find column indices
	const ownAccountIndex = getIndex('Own account name');
	const dateTimeIndex = getIndex('Transaction Date Time');
	const partnerNameIndex = getIndex('Partner Name');
	const amountIndex = getIndex('Amount');
	const bookingDateIndex = getIndex('Booking Date');
	const categoryIndex = getIndex('Category');

	// Check if all required columns exist
	if (
		ownAccountIndex === -1 ||
		dateTimeIndex === -1 ||
		partnerNameIndex === -1 ||
		amountIndex === -1
	) {
		return { transactions: [], error: 'CSV file is missing required columns' };
	}

	// Parse data rows
	const parsedTransactions: TransactionImport[] = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = parseCSVLine(line);

		const ownAccountName = values[ownAccountIndex] || '';
		const partnerName = values[partnerNameIndex] || '';
		const amount = values[amountIndex] || '';
		const bookingDate = bookingDateIndex !== -1 ? values[bookingDateIndex] || '' : '';
		const categoryRaw = categoryIndex !== -1 ? values[categoryIndex] || '' : '';

		let transactionDateTime = (values[dateTimeIndex] || '').trim();
		if (!transactionDateTime) {
			const bookingDateTime = withMidnightTimeIfMissing(bookingDate);
			if (!bookingDateTime) {
				// Can't build a stable unique key without either Transaction Date Time or Booking Date.
				continue;
			}
			// Fallback unique key for rows without Transaction Date Time
			transactionDateTime = `${bookingDateTime}|${partnerName.trim()}|${amount.trim()}`;
		}

		const categoryName = normalizeCsvCategory(categoryRaw);

		parsedTransactions.push({
			ownAccountName,
			transactionDateTime,
			partnerName,
			amount,
			categoryName: categoryName ?? undefined
		});
	}

	return { transactions: parsedTransactions };
};

export const importTransactions = async (
	transactions: TransactionImport[]
): Promise<ImportOutcome> => {
	const response = await fetch('/api/transactions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(transactions)
	});

	if (!response.ok) throw new Error('Failed to save transactions');

	const result = await response.json();
	const imported = Number(result?.count) || 0;

	return {
		parsed: transactions.length,
		imported,
		skipped: Math.max(0, transactions.length - imported)
	};
};
