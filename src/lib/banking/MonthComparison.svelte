<script lang="ts">
	import {
		formatNumber,
		formatMonthLabel,
		type ComparisonMetric,
		type MonthComparison
	} from '$lib/banking/categoryUtils';

	interface Props {
		comparison: MonthComparison;
	}

	let { comparison }: Props = $props();

	const currentLabel = $derived(formatMonthLabel(comparison.currentMonthKey));
	const previousLabel = $derived(formatMonthLabel(comparison.previousMonthKey));

	const formatDelta = (value: number) => {
		if (value === 0) return '0';
		const arrow = value > 0 ? '▲' : '▼';
		return `${arrow} ${formatNumber(Math.abs(value))}`;
	};

	const formatPct = (value: number | null) => {
		if (value === null) return '';
		const rounded = Math.round(value);
		return `${rounded > 0 ? '+' : ''}${rounded}%`;
	};

	const formatAverage = (value: number | null) => (value === null ? '—' : formatNumber(value));

	// For spending, going up is "bad" (red). For income, going up is "good" (green).
	const toneClass = (metric: ComparisonMetric, kind: 'spend' | 'income') => {
		if (metric.delta === 0) return 'flat';
		const wentUp = metric.delta > 0;
		const good = kind === 'income' ? wentUp : !wentUp;
		return good ? 'good' : 'bad';
	};
</script>

<section class="comparison">
	<h2 class="summary-title">Month over Month</h2>

	{#if !comparison.hasPreviousData && comparison.monthsInAverage === 0}
		<p class="muted">No earlier months imported yet — nothing to compare against.</p>
	{:else}
		<div class="table-scroll">
			<table class="comparison-table">
				<thead>
					<tr>
						<th>Metric</th>
						<th class="num">{currentLabel}</th>
						<th class="num">{previousLabel}</th>
						<th class="num">Change</th>
						<th class="num">
							{comparison.monthsInAverage > 0 ? `${comparison.monthsInAverage}-mo avg` : 'Prev avg'}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each [{ label: 'Spending', kind: 'spend', metric: comparison.totals.spend }, { label: 'Income', kind: 'income', metric: comparison.totals.income }, { label: 'Net', kind: 'income', metric: comparison.totals.net }] as row (row.label)}
						<tr>
							<th scope="row">{row.label}</th>
							<td class="num strong">{formatNumber(row.metric.current)}</td>
							<td class="num muted">{formatNumber(row.metric.previous)}</td>
							<td class="num {toneClass(row.metric, row.kind as 'spend' | 'income')}">
								{formatDelta(row.metric.delta)}
								{#if row.metric.deltaPct !== null}
									<span class="pct">({formatPct(row.metric.deltaPct)})</span>
								{/if}
							</td>
							<td class="num muted">{formatAverage(row.metric.avg)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if comparison.categories.length > 0}
			<h3 class="movers-title">Category changes</h3>
			<div class="table-scroll">
				<table class="comparison-table">
					<thead>
						<tr>
							<th>Category</th>
							<th class="num">{currentLabel}</th>
							<th class="num">{previousLabel}</th>
							<th class="num">Change</th>
							<th class="num">
								{comparison.monthsInAverage > 0
									? `${comparison.monthsInAverage}-mo avg`
									: 'Prev avg'}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each comparison.categories as row (row.category.id)}
							<tr>
								<th scope="row">
									{row.category.name}
									{#if row.kind === 'income'}<span class="tag">income</span>{/if}
								</th>
								<td class="num strong">{formatNumber(row.metric.current)}</td>
								<td class="num muted">{formatNumber(row.metric.previous)}</td>
								<td class="num {toneClass(row.metric, row.kind)}">
									{formatDelta(row.metric.delta)}
									{#if row.metric.deltaPct !== null}
										<span class="pct">({formatPct(row.metric.deltaPct)})</span>
									{/if}
								</td>
								<td class="num muted">{formatAverage(row.metric.avg)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</section>

<style>
	.comparison {
		margin-top: 2rem;
		padding: 1.5rem;
		border: 1px solid #334155;
		border-radius: 0.75rem;
		background: #1e293b;
	}

	.summary-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 1rem;
	}

	.movers-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 1.5rem 0 0.75rem;
	}

	.muted {
		color: #94a3b8;
	}

	.table-scroll {
		overflow-x: auto;
	}

	.comparison-table {
		width: 100%;
		min-width: 560px;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.comparison-table th {
		text-align: left;
		padding: 0.6rem 0.75rem;
		font-weight: 700;
		color: #cbd5e1;
		border-bottom: 1px solid #334155;
	}

	.comparison-table tbody th {
		color: #f1f5f9;
		border-bottom: none;
		border-top: 1px solid #334155;
	}

	.comparison-table td {
		padding: 0.6rem 0.75rem;
		color: #e2e8f0;
		border-top: 1px solid #334155;
	}

	.num {
		text-align: right;
		font-family: 'Courier New', monospace;
		white-space: nowrap;
	}

	.strong {
		font-weight: 700;
		color: #f1f5f9;
	}

	td.muted {
		color: #94a3b8;
	}

	.pct {
		opacity: 0.8;
		font-size: 0.85em;
	}

	.good {
		color: #86efac;
	}

	.bad {
		color: #fca5a5;
	}

	.flat {
		color: #94a3b8;
	}

	.tag {
		margin-left: 0.4rem;
		padding: 0.05rem 0.4rem;
		border-radius: 0.25rem;
		background: #334155;
		color: #a5f3fc;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		vertical-align: middle;
	}
</style>
