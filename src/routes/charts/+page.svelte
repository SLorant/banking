<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import MonthControls from '$lib/banking/MonthControls.svelte';
	import ChartCard from '$lib/charts/ChartCard.svelte';
	import StatTile from '$lib/charts/StatTile.svelte';
	import BarChartH from '$lib/charts/BarChartH.svelte';
	import StackedBarH from '$lib/charts/StackedBarH.svelte';
	import ColumnChart from '$lib/charts/ColumnChart.svelte';
	import { buildMonths, formatMonthLabel, formatNumber } from '$lib/banking/categoryUtils';
	import {
		buildKpis,
		buildMonthlyTotals,
		categoryMixOverTime,
		pickTrailing,
		spendingByCategory,
		spendingByWeekday,
		topMerchants,
		trailingMonthKeys
	} from '$lib/charts/chartUtils';
	import type { Category, Transaction } from '../types';

	let transactions: Transaction[] = $state([]);
	let categories: Category[] = $state([]);
	let months: string[] = $state([]);
	let selectedMonth = $state('');
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

	const monthlyTotals = $derived(buildMonthlyTotals(transactions));
	const kpis = $derived(selectedMonth ? buildKpis(monthlyTotals, selectedMonth) : []);

	const trailing12 = $derived(selectedMonth ? pickTrailing(monthlyTotals, selectedMonth, 12) : []);

	const netGroups = $derived(
		trailing12.map((t) => ({
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
		trailing12.map((t) => ({
			label: monthShort(t.monthKey),
			bars: [
				{ key: 'income', value: Math.round(t.income), color: 'var(--series-1)' },
				{ key: 'spend', value: Math.round(t.spend), color: 'var(--series-2)' }
			]
		}))
	);

	const categoryBars = $derived(
		selectedMonth ? spendingByCategory(transactions, categories, selectedMonth) : []
	);

	const merchantBars = $derived(selectedMonth ? topMerchants(transactions, selectedMonth, 10) : []);

	const weekdayGroups = $derived(
		(selectedMonth ? spendingByWeekday(transactions, selectedMonth) : []).map((d) => ({
			label: d.label,
			bars: [{ key: 'spend', value: Math.round(d.value), color: 'var(--series-1)' }]
		}))
	);

	const mix = $derived.by(() => {
		if (!selectedMonth) return { keys: [], rows: [] };
		return categoryMixOverTime(
			transactions,
			categories,
			trailingMonthKeys(selectedMonth, 6),
			5,
			STACK_PALETTE
		);
	});
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

		<MonthControls bind:selectedMonth {months} />

		{#if loading}
			<div class="panel">Loading…</div>
		{:else if error}
			<div class="panel error">{error}</div>
		{:else if !selectedMonth}
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
					/>
				{/each}
			</section>

			<div class="grid">
				<ChartCard
					title="Net cash flow by month"
					subtitle="Income minus spending, last 12 months ending {formatMonthLabel(selectedMonth)}"
					tableColumns={['Month', 'Net']}
					tableRows={trailing12.map((t) => [formatMonthLabel(t.monthKey), money(t.net)])}
				>
					<ColumnChart groups={netGroups} format={money} />
				</ChartCard>

				<ChartCard
					title="Income vs spending by month"
					subtitle="Last 12 months ending {formatMonthLabel(selectedMonth)}"
					tableColumns={['Month', 'Income', 'Spending']}
					tableRows={trailing12.map((t) => [
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
					subtitle={formatMonthLabel(selectedMonth)}
					tableColumns={['Category', 'Spent']}
					tableRows={categoryBars.map((b) => [b.label, money(b.value)])}
				>
					<BarChartH bars={categoryBars} />
				</ChartCard>

				<ChartCard
					title="Category mix over time"
					subtitle="Top 5 categories, last 6 months"
					tableColumns={['Month', ...mix.keys.map((k) => k.label), 'Total']}
					tableRows={mix.rows.map((row) => [
						formatMonthLabel(row.monthKey),
						...mix.keys.map((k) => money(row.segments[k.key] ?? 0)),
						money(row.total)
					])}
				>
					<StackedBarH
						rows={mix.rows}
						keys={mix.keys}
						rowLabel={(key) => formatMonthLabel(key)}
						format={money}
					/>
				</ChartCard>

				<ChartCard
					title="Top merchants"
					subtitle="Largest counterparties by spend, {formatMonthLabel(selectedMonth)}"
					tableColumns={['Merchant', 'Spent']}
					tableRows={merchantBars.map((b) => [b.label, money(b.value)])}
				>
					<BarChartH bars={merchantBars} emptyText="No merchant spending this month." />
				</ChartCard>

				<ChartCard
					title="Spending by day of week"
					subtitle={formatMonthLabel(selectedMonth)}
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
