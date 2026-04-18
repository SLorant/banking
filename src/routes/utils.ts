import type { Transaction } from '$lib/db';

type TransactionImport = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & {
	categoryName?: string;
};

export const handleFileUpload = (event: Event, loading: boolean, saveStatus: string) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];

	if (!file) return;

	const reader = new FileReader();
	reader.onload = (e) => {
		const text = e.target?.result as string;
		parseCSV(text, loading, saveStatus);
	};
	reader.readAsText(file);
};

export const loadTransactions = async (
	transactions: Transaction[],
	loading: boolean,
	saveStatus: string
) => {
	loading = true;
	try {
		const response = await fetch('/api/transactions');
		transactions = await response.json();
	} catch (error) {
		console.error('Failed to load transactions', error);
		saveStatus = 'Failed to load transactions';
	} finally {
		loading = false;
	}
	return { transactions, loading, saveStatus };
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

export const parseCSV = (text: string, loading: boolean, saveStatus: string) => {
	const lines = text.split('\n');
	if (lines.length < 2) return;

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
		alert('CSV file is missing required columns');
		return;
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

	// Save to database
	saveTransactionsToDb(parsedTransactions, loading, saveStatus);
};

export const saveTransactionsToDb = async (
	newTransactions: TransactionImport[],
	loading: boolean,
	saveStatus: string
) => {
	loading = true;
	saveStatus = 'Saving...';
	try {
		const response = await fetch('/api/transactions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newTransactions)
		});

		if (response.ok) {
			const result = await response.json();
			saveStatus = `✓ Saved ${result.count} transactions`;
			await loadTransactions([], loading, saveStatus);
			setTimeout(() => (saveStatus = ''), 3000);
		} else {
			saveStatus = '✗ Failed to save';
		}
	} catch (error) {
		console.error('Failed to save transactions:', error);
		saveStatus = '✗ Save error';
	} finally {
		loading = false;
	}
};
