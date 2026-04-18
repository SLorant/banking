<script lang="ts">
	import { formatNumber, formatMonthLabel, type YearAggregate } from '$lib/banking/categoryUtils';

	interface Props {
		yearlySummaries: YearAggregate[];
	}

	let { yearlySummaries }: Props = $props();
</script>

<section class="yearly-summary-section">
	<h2 class="summary-title" style="margin-top: 2rem;">Yearly Summaries</h2>

	<div class="accordion-list">
		{#each yearlySummaries as yearAgg (yearAgg.year)}
			<details class="accordion-item">
				<summary class="accordion-summary">
					<span class="category-name">{yearAgg.year}</span>
					<span class="category-total net" class:positive={yearAgg.totalNet > 0}>
						{formatNumber(yearAgg.totalNet)}
					</span>
				</summary>
				<div class="accordion-body">
					<div class="table-scroll">
						<table class="payment-table">
							<thead>
								<tr>
									<th>Month</th>
									<th class="amount-col">Net Cash Flow</th>
								</tr>
							</thead>
							<tbody>
								{#each yearAgg.months as m (m.monthKey)}
									<tr>
										<td>{formatMonthLabel(m.monthKey)}</td>
										<td class="amount-col net" class:positive={m.net > 0}>{formatNumber(m.net)}</td>
									</tr>
								{/each}
							</tbody>
							<tfoot class="yearly-tfoot">
								<tr>
									<th>Total for {yearAgg.year}</th>
									<th class="amount-col net" class:positive={yearAgg.totalNet > 0}>
										{formatNumber(yearAgg.totalNet)}
									</th>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>
			</details>
		{/each}
	</div>
</section>

<style>
	.summary-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 1rem;
	}

	.accordion-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.accordion-item {
		border: 1px solid #334155;
		border-radius: 0.75rem;
		background: #1e293b;
		overflow: hidden;
	}

	.accordion-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1rem;
		cursor: pointer;
		user-select: none;
	}

	.accordion-summary::-webkit-details-marker {
		display: none;
	}

	.category-name {
		font-weight: 700;
		color: #f1f5f9;
	}

	.category-total {
		color: #cbd5e1;
		font-weight: 600;
	}

	.category-total.net {
		color: #fca5a5;
	}

	.category-total.net.positive {
		color: #86efac;
	}

	.accordion-body {
		border-top: 1px solid #334155;
		padding: 1rem;
	}

	.table-scroll {
		overflow-x: auto;
	}

	.payment-table {
		width: 100%;
		min-width: 640px;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.payment-table thead {
		color: #cbd5e1;
	}

	.payment-table th {
		text-align: left;
		padding: 0.75rem 0;
		font-weight: 700;
		border-bottom: 1px solid #334155;
	}

	.payment-table td {
		padding: 0.75rem 0;
		color: #e2e8f0;
		border-top: 1px solid #334155;
	}

	.yearly-tfoot th {
		border-top: 2px solid #475569;
		border-bottom: none;
		color: #f1f5f9;
		padding-top: 1rem;
	}

	.amount-col {
		text-align: right !important;
		font-family: 'Courier New', monospace;
	}

	.amount-col.net {
		color: #fca5a5;
		font-weight: 600;
	}

	.amount-col.net.positive {
		color: #86efac;
	}

	@media (max-width: 768px) {
		.payment-table {
			min-width: 560px;
		}
	}
</style>
