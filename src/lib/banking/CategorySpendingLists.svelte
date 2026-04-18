<script lang="ts">
	import {
		formatNumber,
		displayTransactionDateTime,
		type CategoryRow
	} from '$lib/banking/categoryUtils';

	interface Props {
		spendingRows: CategoryRow[];
		incomeRows: CategoryRow[];
		mixedRows: CategoryRow[];
	}

	let { spendingRows, incomeRows, mixedRows }: Props = $props();
</script>

{#if spendingRows.length > 0}
	<div class="accordion-list">
		{#each spendingRows as row (row.category.id)}
			<details class="accordion-item">
				<summary class="accordion-summary">
					<span class="category-name">{row.category.name}</span>
					<span class="category-total spend">{formatNumber(row.spend)}</span>
				</summary>

				<div class="accordion-body">
					{#if row.payments.length === 0}
						<p class="muted">No payments in this month.</p>
					{:else}
						<div class="table-scroll">
							<table class="payment-table">
								<thead>
									<tr>
										<th>Date</th>
										<th>Partner</th>
										<th>Account</th>
										<th class="amount-col">Amount</th>
									</tr>
								</thead>
								<tbody>
									{#each row.payments as tx (tx.id ?? tx.transactionDateTime)}
										<tr>
											<td>{displayTransactionDateTime(tx.transactionDateTime)}</td>
											<td>{tx.partnerName}</td>
											<td>{tx.ownAccountName}</td>
											<td class="amount-col">{tx.amount}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</details>
		{/each}
	</div>
{/if}

{#if incomeRows.length > 0 || mixedRows.length > 0}
	<div class="income-separator">
		<h2>Income & Mixed Categories</h2>
	</div>

	<div class="accordion-list">
		{#each [...incomeRows, ...mixedRows] as row (row.category.id)}
			<details class="accordion-item">
				<summary class="accordion-summary">
					<span class="category-name">{row.category.name}</span>
					<div class="category-totals">
						{#if row.income > 0}
							<span class="category-total income">+{formatNumber(row.income)}</span>
						{/if}
						{#if row.spend > 0}
							<span class="category-total spend">-{formatNumber(row.spend)}</span>
						{/if}
					</div>
				</summary>

				<div class="accordion-body">
					{#if row.payments.length === 0}
						<p class="muted">No payments in this month.</p>
					{:else}
						<div class="table-scroll">
							<table class="payment-table">
								<thead>
									<tr>
										<th>Date</th>
										<th>Partner</th>
										<th>Account</th>
										<th class="amount-col">Amount</th>
									</tr>
								</thead>
								<tbody>
									{#each row.payments as tx (tx.id ?? tx.transactionDateTime)}
										<tr>
											<td>{displayTransactionDateTime(tx.transactionDateTime)}</td>
											<td>{tx.partnerName}</td>
											<td>{tx.ownAccountName}</td>
											<td class="amount-col">{tx.amount}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</details>
		{/each}
	</div>
{/if}

<style>
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

	.category-totals {
		display: flex;
		gap: 1rem;
	}

	.category-total {
		color: #cbd5e1;
		font-weight: 600;
	}

	.category-total.spend {
		color: #fca5a5;
	}

	.category-total.income {
		color: #86efac;
	}

	.accordion-body {
		border-top: 1px solid #334155;
		padding: 1rem;
	}

	.muted {
		margin: 0;
		color: #94a3b8;
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

	.amount-col {
		text-align: right !important;
		font-family: 'Courier New', monospace;
	}

	.income-separator {
		margin-top: 2rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #334155;
	}

	.income-separator h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0;
	}

	@media (max-width: 768px) {
		.payment-table {
			min-width: 560px;
		}
	}
</style>
