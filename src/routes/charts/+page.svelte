<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import PeriodControls from '$lib/charts/PeriodControls.svelte';
	import ChartCard from '$lib/charts/ChartCard.svelte';
	import StatTile from '$lib/charts/StatTile.svelte';
	import BarChartH from '$lib/charts/BarChartH.svelte';
	import StackedBarH from '$lib/charts/StackedBarH.svelte';
	import ColumnChart from '$lib/charts/ColumnChart.svelte';
	import {
		buildMonths,
		formatMonthLabel,
		formatNumber,
		shiftMonthKey
	} from '$lib/banking/categoryUtils';
	import {
		buildKpis,
		buildMonthlyTotals,
		categoryMixOverTime,
		monthKeysForYear,
		pickMonths,
		spendingByCategory,
		spendingByWeekday,
		topMerchants,
		trailingMonthKeys
	} from '$lib/charts/chartUtils';
	import type { Category, Transaction } from '../types';

	let transactions: Transaction[] = $state([]);
	let categories: Category[] = $state([]);
	let months: string[] = $state([]);
	let scope: 'month' | 'year' = $state('month');
	let selectedMonth = $state('');
	let selectedYear = $state('');
	let loading = $state(true);
	let error = $state('');

	const STACK_PALETTE = [
		'var(--series-1)',
		'var(--series-2)',
		'var(--series-3)',
		'var(--series-4)',
		'var(--series-5)'
	];

	onMount(async () => {
		loading = true;
		error = '';
		try {
			const [txResponse, categoryResponse] = await Promise.all([
				fetch('/api/transactions'),
				fetch('/api/categories')
			]);
			if (!txResponse.ok) throw new Error('Failed to fetch transactions');
			if (!categoryResponse.ok) throw new Error('Failed to fetch categories');

			transactions = await txResponse.json();
			categories = await categoryResponse.json();

			months = buildMonths(transactions);
			selectedMonth = months[0] ?? '';
			selectedYear = selectedMonth.split('-')[0] ?? '';
		} catch (e) {
			console.error(e);
			error = 'Failed to load chart data.';
		} finally {
			loading = false;
		}
	});

	const money = (value: number) => formatNumber(Math.round(value));
	const monthShort = (monthKey: string) => {
		const [year, month] = monthKey.split('-').map(Number);
		if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;
		return new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'short' });
	};
	const monthShortYear = (monthKey: string) => `${monthShort(monthKey)} '${monthKey.slice(2, 4)}`;

	const ready = $derived(scope === 'month' ? Boolean(selectedMonth) : Boolean(selectedYear));

	// The months that make up the period being viewed.
	const periodKeys = $derived(
		scope === 'month' ? (selectedMonth ? [selectedMonth] : []) : monthKeysForYear(selectedYear)
	);
	// The comparable prior period (previous month / previous year).
	const previousKeys = $derived(
		scope === 'month'
			? selectedMonth
				? [shiftMonthKey(selectedMonth, -1)]
				: []
			: monthKeysForYear(String(Number(selectedYear) - 1))
	);
	// The run of months shown in the month-by-month trend charts.
	const trendKeys = $derived(
		scope === 'month'
			? selectedMonth
				? trailingMonthKeys(selectedMonth, 12)
				: []
			: monthKeysForYear(selectedYear)
	);
	// The run of months shown in the composition chart.
	const mixKeys = $derived(
		scope === 'month'
			? selectedMonth
				? trailingMonthKeys(selectedMonth, 6)
				: []
			: monthKeysForYear(selectedYear)
	);

	const periodLabel = $derived(
		scope === 'month' ? (selectedMonth ? formatMonthLabel(selectedMonth) : '') : selectedYear
	);
	const comparisonLabel = $derived(scope === 'month' ? 'vs last month' : 'vs last year');
	const trendSubtitle = $derived(
		scope === 'month' ? `Last 12 months ending ${periodLabel}` : `${selectedYear}, month by month`
	);
	const mixSubtitle = $derived(
		scope === 'month' ? 'Top 5 categories, last 6 months' : `Top 5 categories, ${selectedYear}`
	);

	const monthlyTotals = $derived(buildMonthlyTotals(transactions));

	const kpis = $derived(
		ready
			? buildKpis(monthlyTotals, {
					currentKeys: periodKeys,
					previousKeys,
					sparkKeys: scope === 'month' ? trailingMonthKeys(selectedMonth, 6) : periodKeys,
					previousSparkKeys:
						scope === 'month'
							? trailingMonthKeys(shiftMonthKey(selectedMonth, -1), 6)
							: previousKeys,
					comparisonLabel,
					avgLabel: scope === 'month' ? '6-month avg spend' : 'Avg spend / month'
				})
			: []
	);

	const trendMonths = $derived(pickMonths(monthlyTotals, trendKeys));

	const netGroups = $derived(
		trendMonths.map((t) => ({
			label: monthShort(t.monthKey),
			bars: [
				{
					key: 'net',
					value: Math.round(t.net),
					color: t.net >= 0 ? 'var(--series-1)' : 'var(--series-neg)'
				}
			]
		}))
	);

	const flowGroups = $derived(
		trendMonths.map((t) => ({
			label: monthShort(t.monthKey),
			bars: [
				{ key: 'income', value: Math.round(t.income), color: 'var(--series-1)' },
				{ key: 'spend', value: Math.round(t.spend), color: 'var(--series-2)' }
			]
		}))
	);

	const categoryBars = $derived(spendingByCategory(transactions, categories, periodKeys));
	const merchantBars = $derived(topMerchants(transactions, periodKeys, 10));

	const weekdayGroups = $derived(
		spendingByWeekday(transactions, periodKeys).map((d) => ({
			label: d.label,
			bars: [{ key: 'spend', value: Math.round(d.value), color: 'var(--series-1)' }]
		}))
	);

	const mix = $derived(categoryMixOverTime(transactions, categories, mixKeys, 5, STACK_PALETTE));
</script>

<div class="charts-page">
	<div class="container">
		<header class="page-header">
			<h1>Charts</h1>
			<nav>
				<a href={resolve('/')} class="nav-link">Banking</a>
				<a href={resolve('/categories')} class="nav-link">Category Spending</a>
			</nav>
		</header>

		<PeriodControls bind:scope bind:selectedMonth bind:selectedYear {months} />

		{#if loading}
			<div class="panel">Loading…</div>
		{:else if error}
			<div class="panel error">{error}</div>
		{:else if !ready}
			<div class="panel">No transactions found. Import a CSV to see charts.</div>
		{:else}
			<section class="kpi-row">
				{#each kpis as kpi (kpi.label)}
					<StatTile
						label={kpi.label}
						value={kpi.value}
						previous={kpi.previous}
						goodDirection={kpi.goodDirection}
						spark={kpi.spark}
						comparisonLabel={kpi.comparisonLabel}
					/>
				{/each}
			</section>

			<div class="grid">
				<ChartCard
					title="Net cash flow by month"
					subtitle="Income minus spending · {trendSubtitle}"
					tableColumns={['Month', 'Net']}
					tableRows={trendMonths.map((t) => [formatMonthLabel(t.monthKey), money(t.net)])}
				>
					<ColumnChart groups={netGroups} format={money} />
				</ChartCard>

				<ChartCard
					title="Income vs spending by month"
					subtitle={trendSubtitle}
					tableColumns={['Month', 'Income', 'Spending']}
					tableRows={trendMonths.map((t) => [
						formatMonthLabel(t.monthKey),
						money(t.income),
						money(t.spend)
					])}
				>
					<ColumnChart
						groups={flowGroups}
						series={[
							{ key: 'income', label: 'Income' },
							{ key: 'spend', label: 'Spending' }
						]}
						format={money}
					/>
				</ChartCard>

				<ChartCard
					title="Spending by category"
					subtitle={periodLabel}
					tableColumns={['Category', 'Spent']}
					tableRows={categoryBars.map((b) => [b.label, money(b.value)])}
				>
					<BarChartH bars={categoryBars} />
				</ChartCard>

				<ChartCard
					title="Category mix over time"
					subtitle={mixSubtitle}
					tableColumns={['Month', ...mix.keys.map((k) => k.label), 'Total']}
					tableRows={mix.rows.map((row) => [
						formatMonthLabel(row.monthKey),
						...mix.keys.map((k) => money(row.segments[k.key] ?? 0)),
						money(row.total)
					])}
				>
					<StackedBarH rows={mix.rows} keys={mix.keys} rowLabel={monthShortYear} format={money} />
				</ChartCard>

				<ChartCard
					title="Top merchants"
					subtitle="Largest counterparties by spend · {periodLabel}"
					tableColumns={['Merchant', 'Spent']}
					tableRows={merchantBars.map((b) => [b.label, money(b.value)])}
				>
					<BarChartH bars={merchantBars} emptyText="No merchant spending in this period." />
				</ChartCard>

				<ChartCard
					title="Spending by day of week"
					subtitle={periodLabel}
					tableColumns={['Day', 'Spent']}
					tableRows={weekdayGroups.map((g) => [g.label, money(g.bars[0].value)])}
				>
					<ColumnChart groups={weekdayGroups} format={money} height={220} />
				</ChartCard>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background-color: #0f172a;
		color: #e2e8f0;
	}

	.charts-page {
		min-height: 100vh;

		--chart-surface: #1e293b;
		--chart-page: #0f172a;
		--chart-ink: #f1f5f9;
		--chart-ink-secondary: #cbd5e1;
		--chart-muted: #94a3b8;
		--chart-grid: #334155;
		--chart-baseline: #64748b;
		--series-1: #3987e5;
		--series-2: #d95926;
		--series-3: #199e70;
		--series-4: #c98500;
		--series-5: #d55181;
		--series-other: #64748b;
		--series-neg: #e66767;
		--pos: #86efac;
		--neg: #fca5a5;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.page-header h1 {
		font-size: 2.25rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0;
	}

	.page-header nav {
		display: flex;
		gap: 1.25rem;
	}

	.nav-link {
		color: #a5f3fc;
		font-weight: 500;
		text-decoration: none;
		transition: color 0.2s;
	}

	.nav-link:hover {
		color: #8b5cf6;
		text-decoration: underline;
	}

	.panel {
		padding: 1.5rem;
		border: 1px solid #334155;
		border-radius: 0.75rem;
		background: #1e293b;
		color: #cbd5e1;
	}

	.panel.error {
		border-color: #f87171;
		background: rgba(248, 113, 113, 0.08);
		color: #fecaca;
	}

	.kpi-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
		align-items: start;
		gap: 1.25rem;
	}

	@media (max-width: 900px) {
		.container {
			padding: 1rem;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
