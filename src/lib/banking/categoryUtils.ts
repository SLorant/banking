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

export const getDateKey = (value: string): string | null => {
	const text = value?.split('|')[0]?.trim();
	if (!text) return null;

	let match = /^(\d{4})[./-](\d{2})[./-](\d{2})/.exec(text);
	if (match) return `${match[1]}-${match[2]}-${match[3]}`;

	match = /^(\d{2})[./-](\d{2})[./-](\d{4})/.exec(text);
	if (match) return `${match[3]}-${match[2]}-${match[1]}`;

	const date = new Date(text);
	if (!Number.isNaN(date.getTime())) {
		return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
	}

	return null;
};

export const shiftMonthKey = (monthKey: string, deltaMonths: number): string => {
	const [year, month] = monthKey.split('-').map(Number);
	if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;
	const date = new Date(year, month - 1 + deltaMonths, 1);
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
};

export const getPreviousMonthKey = (monthKey: string): string => shiftMonthKey(monthKey, -1);

export const formatDateLabel = (dateKey: string) => {
	const [year, month, day] = dateKey.split('-').map(Number);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return dateKey;
	return new Date(year, month - 1, day).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
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

export type ComparisonMetric = {
	current: number;
	previous: number;
	avg: number | null;
	delta: number;
	deltaPct: number | null;
};

export type CategoryComparisonRow = {
	category: Category;
	kind: 'spend' | 'income';
	metric: ComparisonMetric;
};

export type MonthComparison = {
	currentMonthKey: string;
	previousMonthKey: string;
	hasPreviousData: boolean;
	monthsInAverage: number;
	totals: {
		spend: ComparisonMetric;
		income: ComparisonMetric;
		net: ComparisonMetric;
	};
	categories: CategoryComparisonRow[];
};

type MonthBucket = {
	spend: number;
	income: number;
	byCategory: Record<number, { spend: number; income: number }>;
};

const pctChange = (current: number, previous: number): number | null => {
	if (previous === 0) return null;
	return ((current - previous) / Math.abs(previous)) * 100;
};

const buildMetric = (current: number, previous: number, avg: number | null): ComparisonMetric => ({
	current,
	previous,
	avg,
	delta: current - previous,
	deltaPct: pctChange(current, previous)
});

/**
 * Compares the selected month against the previous calendar month and the
 * average of the three calendar months before it (only counting months that
 * actually have transactions, so not-yet-imported months don't drag the average
 * to zero).
 */
export const calculateMonthComparison = (
	allCategories: Category[],
	allTransactions: Transaction[],
	monthKey: string
): MonthComparison => {
	const buckets: Record<string, MonthBucket> = {};
	const bucketFor = (key: string): MonthBucket => {
		if (!buckets[key]) buckets[key] = { spend: 0, income: 0, byCategory: {} };
		return buckets[key];
	};

	for (const tx of allTransactions) {
		const txMonthKey = getMonthKey(tx.transactionDateTime);
		if (!txMonthKey) continue;

		const amount = parseAmountToNumber(tx.amount);
		if (amount === 0) continue;

		const bucket = bucketFor(txMonthKey);
		let categoryBucket: { spend: number; income: number } | null = null;
		if (tx.categoryId) {
			if (!bucket.byCategory[tx.categoryId]) {
				bucket.byCategory[tx.categoryId] = { spend: 0, income: 0 };
			}
			categoryBucket = bucket.byCategory[tx.categoryId];
		}

		if (amount < 0) {
			bucket.spend += Math.abs(amount);
			if (categoryBucket) categoryBucket.spend += Math.abs(amount);
		} else {
			bucket.income += amount;
			if (categoryBucket) categoryBucket.income += amount;
		}
	}

	const previousMonthKey = getPreviousMonthKey(monthKey);
	const emptyBucket: MonthBucket = { spend: 0, income: 0, byCategory: {} };
	const current = buckets[monthKey] ?? emptyBucket;
	const previous = buckets[previousMonthKey] ?? emptyBucket;
	const hasPreviousData = previousMonthKey in buckets;

	const priorBuckets = [1, 2, 3]
		.map((n) => buckets[shiftMonthKey(monthKey, -n)])
		.filter((bucket): bucket is MonthBucket => Boolean(bucket));
	const monthsInAverage = priorBuckets.length;

	const averageOf = (pick: (bucket: MonthBucket) => number): number | null =>
		monthsInAverage === 0
			? null
			: priorBuckets.reduce((sum, bucket) => sum + pick(bucket), 0) / monthsInAverage;

	const totals = {
		spend: buildMetric(
			current.spend,
			previous.spend,
			averageOf((b) => b.spend)
		),
		income: buildMetric(
			current.income,
			previous.income,
			averageOf((b) => b.income)
		),
		net: buildMetric(
			current.income - current.spend,
			previous.income - previous.spend,
			averageOf((b) => b.income - b.spend)
		)
	};

	const categories: CategoryComparisonRow[] = [];
	for (const category of allCategories) {
		const now = current.byCategory[category.id] ?? { spend: 0, income: 0 };
		const before = previous.byCategory[category.id] ?? { spend: 0, income: 0 };
		const priorForCategory = priorBuckets.map(
			(bucket) => bucket.byCategory[category.id] ?? { spend: 0, income: 0 }
		);
		const averageForCategory = (pick: (value: { spend: number; income: number }) => number) =>
			monthsInAverage === 0
				? null
				: priorForCategory.reduce((sum, value) => sum + pick(value), 0) / monthsInAverage;

		const treatAsIncome = now.income + before.income > now.spend + before.spend;
		const metric = treatAsIncome
			? buildMetric(
					now.income,
					before.income,
					averageForCategory((v) => v.income)
				)
			: buildMetric(
					now.spend,
					before.spend,
					averageForCategory((v) => v.spend)
				);

		if (metric.current === 0 && metric.previous === 0) continue;

		categories.push({ category, kind: treatAsIncome ? 'income' : 'spend', metric });
	}

	categories.sort((a, b) => Math.abs(b.metric.delta) - Math.abs(a.metric.delta));

	return {
		currentMonthKey: monthKey,
		previousMonthKey,
		hasPreviousData,
		monthsInAverage,
		totals,
		categories
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
