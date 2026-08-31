import type { Category, Transaction } from '../../routes/types';
import {
	getDateKey,
	getMonthKey,
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

export const pickTrailing = (
	totals: MonthTotals[],
	monthKey: string,
	count: number
): MonthTotals[] => {
	const wanted = trailingMonthKeys(monthKey, count);
	const bySelectedKey = new Map(totals.map((t) => [t.monthKey, t]));
	return wanted.map(
		(key) => bySelectedKey.get(key) ?? { monthKey: key, spend: 0, income: 0, net: 0 }
	);
};

const categoryNameById = (categories: Category[]): Map<number, string> =>
	new Map(categories.map((c) => [c.id, c.name]));

/** Spend per category for a single month, largest first. Includes an "Uncategorised" row. */
export const spendingByCategory = (
	transactions: Transaction[],
	categories: Category[],
	monthKey: string
): NamedValue[] => {
	const names = categoryNameById(categories);
	const totals = new Map<string, number>();

	for (const tx of transactions) {
		if (getMonthKey(tx.transactionDateTime) !== monthKey) continue;
		const amount = parseAmountToNumber(tx.amount);
		if (amount >= 0) continue;

		const label = (tx.categoryId && names.get(tx.categoryId)) || UNCATEGORISED;
		totals.set(label, (totals.get(label) ?? 0) + Math.abs(amount));
	}

	return [...totals.entries()]
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => b.value - a.value);
};

/** Largest counterparties by spend for a single month. */
export const topMerchants = (
	transactions: Transaction[],
	monthKey: string,
	limit: number
): NamedValue[] => {
	const totals = new Map<string, number>();

	for (const tx of transactions) {
		if (getMonthKey(tx.transactionDateTime) !== monthKey) continue;
		const amount = parseAmountToNumber(tx.amount);
		if (amount >= 0) continue;

		const label = tx.partnerName?.trim() || 'Unknown';
		totals.set(label, (totals.get(label) ?? 0) + Math.abs(amount));
	}

	return [...totals.entries()]
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, limit);
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Total spend by weekday for a single month (Mon–Sun). */
export const spendingByWeekday = (transactions: Transaction[], monthKey: string): NamedValue[] => {
	const totals = new Array(7).fill(0);

	for (const tx of transactions) {
		if (getMonthKey(tx.transactionDateTime) !== monthKey) continue;
		const amount = parseAmountToNumber(tx.amount);
		if (amount >= 0) continue;

		const dateKey = getDateKey(tx.transactionDateTime);
		if (!dateKey) continue;
		const [year, month, day] = dateKey.split('-').map(Number);
		if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) continue;

		// getDay(): 0 = Sunday → shift so Monday = 0.
		const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7;
		totals[weekday] += Math.abs(amount);
	}

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

export const buildKpis = (totals: MonthTotals[], monthKey: string): Kpi[] => {
	const byKey = new Map(totals.map((t) => [t.monthKey, t]));
	const current = byKey.get(monthKey) ?? { monthKey, spend: 0, income: 0, net: 0 };
	const previous = byKey.get(shiftMonthKey(monthKey, -1)) ?? null;

	const window6 = pickTrailing(totals, monthKey, 6);
	const sparkSpend = window6.map((t) => t.spend);
	const sparkIncome = window6.map((t) => t.income);
	const sparkNet = window6.map((t) => t.net);

	const priorFive = pickTrailing(totals, shiftMonthKey(monthKey, -1), 5);
	const avgWindow = [...priorFive, current];
	const avgSpend = avgWindow.reduce((sum, t) => sum + t.spend, 0) / avgWindow.length;
	const prevAvgWindow = pickTrailing(totals, shiftMonthKey(monthKey, -1), 6);
	const prevAvgSpend = prevAvgWindow.reduce((sum, t) => sum + t.spend, 0) / prevAvgWindow.length;

	return [
		{
			label: 'Spending',
			value: current.spend,
			previous: previous?.spend ?? null,
			goodDirection: 'down',
			spark: sparkSpend
		},
		{
			label: 'Income',
			value: current.income,
			previous: previous?.income ?? null,
			goodDirection: 'up',
			spark: sparkIncome
		},
		{
			label: 'Net',
			value: current.net,
			previous: previous?.net ?? null,
			goodDirection: 'up',
			spark: sparkNet
		},
		{
			label: '6-month avg spend',
			value: avgSpend,
			previous: prevAvgSpend,
			goodDirection: 'down',
			spark: sparkSpend
		}
	];
};
