<script lang="ts">
	import { formatNumber, type MonthAggregate } from '$lib/banking/categoryUtils';

	interface Props {
		aggregate: MonthAggregate;
	}

	let { aggregate }: Props = $props();
</script>

<footer class="month-summary">
	<h2 class="summary-title">Month Summary</h2>
	<div class="summary-grid">
		<div class="summary-item">
			<span class="summary-label">Total Spending</span>
			<span class="summary-value spend">{formatNumber(aggregate.totalSpend)}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Total Income</span>
			<span class="summary-value income">{formatNumber(aggregate.totalIncome)}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Net Change</span>
			<span class="summary-value net" class:positive={aggregate.net > 0}>
				{formatNumber(aggregate.net)}
			</span>
		</div>
	</div>
</footer>

<style>
	.month-summary {
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

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		background: #0f172a;
		border-radius: 0.5rem;
	}

	.summary-label {
		font-size: 0.9rem;
		color: #cbd5e1;
	}

	.summary-value {
		font-size: 1.5rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
	}

	.summary-value.spend {
		color: #fca5a5;
	}

	.summary-value.income {
		color: #86efac;
	}

	.summary-value.net {
		color: #cbd5e1;
	}

	.summary-value.net.positive {
		color: #86efac;
	}
</style>
