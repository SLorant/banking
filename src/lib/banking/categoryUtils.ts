import type { Transaction, Category } from '../../routes/types';

export type CategoryRow = {
	category: Category;
	spend: number;
	income: number;
	payments: Transaction[];
};

export type MonthAggregate = {
	totalSpend: number;
	totalIncome: number;
	net: number;
};

export type YearAggregate = {
	year: string;
	months: { monthKey: string; net: number }[];
	totalNet: number;
};

export const pad2 = (value: number) => String(value).padStart(2, '0');

export const getMonthKey = (value: string): string | null => {
	const text = value?.trim();
	if (!text) return null;

	let match = /^(\d{4})[./-](\d{2})[./-](\d{2})/.exec(text);
	if (match) return `${match[1]}-${match[2]}`;

	match = /^(\d{2})[./-](\d{2})[./-](\d{4})/.exec(text);
	if (match) return `${match[3]}-${match[2]}`;

	const date = new Date(text);
	if (!Number.isNaN(date.getTime())) {
		return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
	}

	return null;
};

export const formatMonthLabel = (monthKey: string) => {
	const [year, month] = monthKey.split('-');
	const yearNum = Number(year);
	const monthNum = Number(month);
	if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) return monthKey;
	const date = new Date(yearNum, monthNum - 1, 1);
	return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
};

export const parseAmountToNumber = (value: string): number => {
	if (!value) return 0;

	let text = value.trim();
	if (!text) return 0;

	let negative = false;
	if (text.startsWith('(') && text.endsWith(')')) {
		negative = true;
		text = text.slice(1, -1);
	}

	text = text.replace(/[^0-9.,-]/g, '');

	if (text.startsWith('-')) {
		negative = true;
		text = text.slice(1);
	}

	const hasDot = text.includes('.');
	const hasComma = text.includes(',');

	let normalized = text;
	if (hasDot && hasComma) {
		const lastDot = text.lastIndexOf('.');
		const lastComma = text.lastIndexOf(',');
		const decimalSeparator = lastDot > lastComma ? '.' : ',';
		const thousandSeparator = decimalSeparator === '.' ? ',' : '.';
		normalized = text.split(thousandSeparator).join('');
		if (decimalSeparator === ',') normalized = normalized.replace(',', '.');
	} else if (hasComma) {
		const lastComma = text.lastIndexOf(',');
		const digitsAfter = text.length - lastComma - 1;
		normalized = digitsAfter === 3 ? text.split(',').join('') : text.replace(',', '.');
	} else if (hasDot) {
		const lastDot = text.lastIndexOf('.');
		const digitsAfter = text.length - lastDot - 1;
		normalized = digitsAfter === 3 ? text.split('.').join('') : text;
	}

	const result = Number(normalized);
	if (!Number.isFinite(result)) return 0;
	return negative ? -result : result;
};

export const formatNumber = (value: number) => new Intl.NumberFormat(undefined).format(value);
export const displayTransactionDateTime = (value: string) => value.split('|')[0] ?? value;

export const buildMonths = (txs: Transaction[]) => {
	const unique: Record<string, true> = {};
	for (const tx of txs) {
		const monthKey = getMonthKey(tx.transactionDateTime);
		if (monthKey) unique[monthKey] = true;
	}
	return Object.keys(unique).sort((a, b) => b.localeCompare(a));
};

export const buildCategoryRows = (
	allCategories: Category[],
	allTransactions: Transaction[],
	monthKey: string
): CategoryRow[] => {
	const rowsById: Record<number, CategoryRow> = {};
	for (const category of allCategories) {
		rowsById[category.id] = { category, spend: 0, income: 0, payments: [] };
	}

	for (const tx of allTransactions) {
		if (!tx.categoryId) continue;
		const txMonthKey = getMonthKey(tx.transactionDateTime);
		if (!txMonthKey || txMonthKey !== monthKey) continue;

		const row = rowsById[tx.categoryId];
		if (!row) continue;

		row.payments.push(tx);
		const amount = parseAmountToNumber(tx.amount);
		if (amount < 0) {
			row.spend += Math.abs(amount);
		} else if (amount > 0) {
			row.income += amount;
		}
	}

	for (const row of Object.values(rowsById)) {
		row.payments.sort((a, b) => b.transactionDateTime.localeCompare(a.transactionDateTime));
	}

	return allCategories.map((c) => rowsById[c.id]);
};

export const calculateMonthAggregate = (
	allTransactions: Transaction[],
	monthKey: string
): MonthAggregate => {
	let totalSpend = 0;
	let totalIncome = 0;

	for (const tx of allTransactions) {
		const txMonthKey = getMonthKey(tx.transactionDateTime);
		if (!txMonthKey || txMonthKey !== monthKey) continue;

		const amount = parseAmountToNumber(tx.amount);
		if (amount < 0) {
			totalSpend += Math.abs(amount);
		} else if (amount > 0) {
			totalIncome += amount;
		}
	}

	return {
		totalSpend,
		totalIncome,
		net: totalIncome - totalSpend
	};
};

export const calculateYearlySummaries = (allTransactions: () => Transaction[]): YearAggregate[] => {
	const yearMap: Record<string, YearAggregate> = {};
	const monthNet: Record<string, number> = {};

	for (const tx of allTransactions()) {
		const monthKey = getMonthKey(tx.transactionDateTime);
		if (!monthKey) continue;

		const amount = parseAmountToNumber(tx.amount);
		if (!monthNet[monthKey]) monthNet[monthKey] = 0;
		monthNet[monthKey] += amount;
	}

	for (const [monthKey, net] of Object.entries(monthNet)) {
		const year = monthKey.split('-')[0];
		if (!yearMap[year]) {
			yearMap[year] = { year, months: [], totalNet: 0 };
		}
		yearMap[year].months.push({ monthKey, net });
		yearMap[year].totalNet += net;
	}

	const result = Object.values(yearMap).sort((a, b) => b.year.localeCompare(a.year));
	for (const yearAgg of result) {
		yearAgg.months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
	}

	return result;
};
