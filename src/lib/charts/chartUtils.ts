import type { Category, Transaction } from '../../routes/types';
import {
	getDateKey,
	getMonthKey,
	pad2,
	parseAmountToNumber,
	shiftMonthKey
} from '../banking/categoryUtils';

export type MonthTotals = {
	monthKey: string;
	spend: number;
	income: number;
	net: number;
};

export type NamedValue = {
	label: string;
	value: number;
};

export type StackedRow = {
	monthKey: string;
	total: number;
	segments: Record<string, number>;
};

export type StackKey = {
	key: string;
	label: string;
	color: string;
};

export type Kpi = {
	label: string;
	value: number;
	previous: number | null;
	/** Which direction is a "good" change, for colouring the delta. */
	goodDirection: 'up' | 'down';
	spark: number[];
	/** e.g. "vs last month" / "vs last year". */
	comparisonLabel: string;
};

const UNCATEGORISED = 'Uncategorised';

/** Compact number for axis ticks: 980 → "980", 12_400 → "12.4k", 1_250_000 → "1.3M". */
export const compactNumber = (value: number): string => {
	const abs = Math.abs(value);
	const sign = value < 0 ? '-' : '';
	if (abs < 1000) return `${sign}${Math.round(abs)}`;
	if (abs < 1_000_000) {
		const k = abs / 1000;
		return `${sign}${k < 10 ? k.toFixed(1) : Math.round(k)}k`;
	}
	const m = abs / 1_000_000;
	return `${sign}${m < 10 ? m.toFixed(1) : Math.round(m)}M`;
};

/** Month keys from `count` months before `monthKey` up to and including it, oldest first. */
export const trailingMonthKeys = (monthKey: string, count: number): string[] => {
	const keys: string[] = [];
	for (let i = count - 1; i >= 0; i--) {
		keys.push(shiftMonthKey(monthKey, -i));
	}
	return keys;
};

/** The twelve month keys of a calendar year, January first. */
export const monthKeysForYear = (year: string): string[] =>
	Array.from({ length: 12 }, (_, i) => `${year}-${pad2(i + 1)}`);

/** Per-month spend / income / net across every transaction, oldest month first. */
export const buildMonthlyTotals = (transactions: Transaction[]): MonthTotals[] => {
	const byMonth = new Map<string, MonthTotals>();

	for (const tx of transactions) {
		const monthKey = getMonthKey(tx.transactionDateTime);
		if (!monthKey) continue;

		const amount = parseAmountToNumber(tx.amount);
		if (amount === 0) continue;

		let entry = byMonth.get(monthKey);
		if (!entry) {
			entry = { monthKey, spend: 0, income: 0, net: 0 };
			byMonth.set(monthKey, entry);
		}

		if (amount < 0) entry.spend += Math.abs(amount);
		else entry.income += amount;
		entry.net = entry.income - entry.spend;
	}

	return [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
};

/** Line up `totals` with an explicit ordered list of month keys, filling gaps with zeroes. */
export const pickMonths = (totals: MonthTotals[], monthKeys: string[]): MonthTotals[] => {
	const byKey = new Map(totals.map((t) => [t.monthKey, t]));
	return monthKeys.map((key) => byKey.get(key) ?? { monthKey: key, spend: 0, income: 0, net: 0 });
};

export const pickTrailing = (
	totals: MonthTotals[],
	monthKey: string,
	count: number
): MonthTotals[] => pickMonths(totals, trailingMonthKeys(monthKey, count));

/** Sum spend / income / net over an arbitrary set of months. */
export const sumMonths = (
	totals: MonthTotals[],
	monthKeys: string[]
): { spend: number; income: number; net: number } => {
	const picked = pickMonths(totals, monthKeys);
	const spend = picked.reduce((sum, t) => sum + t.spend, 0);
	const income = picked.reduce((sum, t) => sum + t.income, 0);
	return { spend, income, net: income - spend };
};

const anyMonthHasData = (totals: MonthTotals[], monthKeys: string[]): boolean => {
	const set = new Set(monthKeys);
	return totals.some((t) => set.has(t.monthKey));
};

const categoryNameById = (categories: Category[]): Map<number, string> =>
	new Map(categories.map((c) => [c.id, c.name]));

const spendInMonths = (
	transactions: Transaction[],
	monthKeys: string[],
	onSpend: (tx: Transaction, abs: number) => void
): void => {
	const set = new Set(monthKeys);
	for (const tx of transactions) {
		const monthKey = getMonthKey(tx.transactionDateTime);
		if (!monthKey || !set.has(monthKey)) continue;
		const amount = parseAmountToNumber(tx.amount);
		if (amount >= 0) continue;
		onSpend(tx, Math.abs(amount));
	}
};

/** Spend per category over the given months, largest first. Includes an "Uncategorised" row. */
export const spendingByCategory = (
	transactions: Transaction[],
	categories: Category[],
	monthKeys: string[]
): NamedValue[] => {
	const names = categoryNameById(categories);
	const totals = new Map<string, number>();

	spendInMonths(transactions, monthKeys, (tx, abs) => {
		const label = (tx.categoryId && names.get(tx.categoryId)) || UNCATEGORISED;
		totals.set(label, (totals.get(label) ?? 0) + abs);
	});

	return [...totals.entries()]
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => b.value - a.value);
};

/** Largest counterparties by spend over the given months. */
export const topMerchants = (
	transactions: Transaction[],
	monthKeys: string[],
	limit: number
): NamedValue[] => {
	const totals = new Map<string, number>();

	spendInMonths(transactions, monthKeys, (tx, abs) => {
		const label = tx.partnerName?.trim() || 'Unknown';
		totals.set(label, (totals.get(label) ?? 0) + abs);
	});

	return [...totals.entries()]
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, limit);
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Total spend by weekday over the given months (Mon–Sun). */
export const spendingByWeekday = (
	transactions: Transaction[],
	monthKeys: string[]
): NamedValue[] => {
	const totals = new Array(7).fill(0);

	spendInMonths(transactions, monthKeys, (tx, abs) => {
		const dateKey = getDateKey(tx.transactionDateTime);
		if (!dateKey) return;
		const [year, month, day] = dateKey.split('-').map(Number);
		if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return;

		// getDay(): 0 = Sunday → shift so Monday = 0.
		const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7;
		totals[weekday] += abs;
	});

	return WEEKDAYS.map((label, i) => ({ label, value: totals[i] }));
};

/**
 * Spend composition over a window of months: the `topN` categories by total
 * spend over the window keep their own segment, everything else (small
 * categories + uncategorised) folds into "Other".
 */
export const categoryMixOverTime = (
	transactions: Transaction[],
	categories: Category[],
	monthKeys: string[],
	topN: number,
	palette: string[]
): { keys: StackKey[]; rows: StackedRow[] } => {
	const names = categoryNameById(categories);
	const monthSet = new Set(monthKeys);

	// Total spend per category label across the whole window.
	const windowTotals = new Map<string, number>();
	// Per-month spend per category label.
	const perMonth = new Map<string, Map<string, number>>();
	for (const key of monthKeys) perMonth.set(key, new Map());

	for (const tx of transactions) {
		const monthKey = getMonthKey(tx.transactionDateTime);
		if (!monthKey || !monthSet.has(monthKey)) continue;
		const amount = parseAmountToNumber(tx.amount);
		if (amount >= 0) continue;

		const label = (tx.categoryId && names.get(tx.categoryId)) || UNCATEGORISED;
		const abs = Math.abs(amount);
		windowTotals.set(label, (windowTotals.get(label) ?? 0) + abs);
		const monthMap = perMonth.get(monthKey)!;
		monthMap.set(label, (monthMap.get(label) ?? 0) + abs);
	}

	const ranked = [...windowTotals.entries()].sort((a, b) => b[1] - a[1]);
	const topLabels = ranked.slice(0, topN).map(([label]) => label);
	const hasOther = ranked.length > topLabels.length;

	const keys: StackKey[] = topLabels.map((label, i) => ({
		key: label,
		label,
		color: palette[i % palette.length]
	}));
	if (hasOther) {
		keys.push({ key: '__other__', label: 'Other', color: 'var(--series-other)' });
	}

	const topSet = new Set(topLabels);
	const rows: StackedRow[] = monthKeys.map((monthKey) => {
		const monthMap = perMonth.get(monthKey)!;
		const segments: Record<string, number> = {};
		let total = 0;
		for (const [label, value] of monthMap) {
			const key = topSet.has(label) ? label : '__other__';
			segments[key] = (segments[key] ?? 0) + value;
			total += value;
		}
		return { monthKey, total, segments };
	});

	return { keys, rows };
};

export type KpiConfig = {
	/** Months that make up the period being viewed. */
	currentKeys: string[];
	/** Months of the comparable prior period (previous month, or previous year). */
	previousKeys: string[];
	/** Ordered months feeding the sparklines (and the average-spend figure). */
	sparkKeys: string[];
	/** Ordered months feeding the prior average-spend figure. */
	previousSparkKeys: string[];
	comparisonLabel: string;
	avgLabel: string;
};

export const buildKpis = (totals: MonthTotals[], config: KpiConfig): Kpi[] => {
	const current = sumMonths(totals, config.currentKeys);
	const hasPrevious = anyMonthHasData(totals, config.previousKeys);
	const previous = hasPrevious ? sumMonths(totals, config.previousKeys) : null;

	const sparkMonths = pickMonths(totals, config.sparkKeys);
	const prevSparkMonths = pickMonths(totals, config.previousSparkKeys);
	const mean = (months: MonthTotals[]) =>
		months.length ? months.reduce((sum, t) => sum + t.spend, 0) / months.length : 0;
	const avgSpend = mean(sparkMonths);
	const prevAvgSpend = anyMonthHasData(totals, config.previousSparkKeys)
		? mean(prevSparkMonths)
		: null;

	return [
		{
			label: 'Spending',
			value: current.spend,
			previous: previous?.spend ?? null,
			goodDirection: 'down',
			spark: sparkMonths.map((t) => t.spend),
			comparisonLabel: config.comparisonLabel
		},
		{
			label: 'Income',
			value: current.income,
			previous: previous?.income ?? null,
			goodDirection: 'up',
			spark: sparkMonths.map((t) => t.income),
			comparisonLabel: config.comparisonLabel
		},
		{
			label: 'Net',
			value: current.net,
			previous: previous?.net ?? null,
			goodDirection: 'up',
			spark: sparkMonths.map((t) => t.net),
			comparisonLabel: config.comparisonLabel
		},
		{
			label: config.avgLabel,
			value: avgSpend,
			previous: prevAvgSpend,
			goodDirection: 'down',
			spark: sparkMonths.map((t) => t.spend),
			comparisonLabel: config.comparisonLabel
		}
	];
};
