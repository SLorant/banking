<script lang="ts">
	import type { Category, Transaction } from '../../routes/types';

	let {
		transactions = $bindable(),
		loading = $bindable(),
		categories,
		categoriesLoading
	}: {
		transactions: Transaction[];
		categories: Category[];
		loading: boolean;
		categoriesLoading: boolean;
	} = $props();

	/* 	let transactions: Transaction[] = $state([]);
	let categories: Category[] = $state([]);
	let loading = $state(false);
    
	let categoriesLoading = $state(false); */
	let editingCell: { rowIndex: number; field: keyof Transaction } | null = $state(null);

	const deleteRow = async (index: number) => {
		const transaction = transactions[index];
		if (!transaction.id) {
			// If no ID, just remove from local array
			transactions = transactions.filter((_, i) => i !== index);
			return;
		}

		loading = true;
		try {
			const response = await fetch(`/api/transactions?id=${transaction.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				transactions = transactions.filter((_, i) => i !== index);
			}
		} catch (error) {
			console.error('Failed to delete transaction', error);
		} finally {
			loading = false;
		}
	};

	const handleCellEdit = async (rowIndex: number, field: keyof Transaction, value: string) => {
		(transactions[rowIndex][field] as string) = value;
		transactions = transactions; // Trigger reactivity

		const transaction = transactions[rowIndex];
		if (!transaction.id) return; // Don't save if no ID yet

		// Debounced save
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			try {
				await fetch('/api/transactions', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(transaction)
				});
			} catch (error) {
				console.error('Failed to update transaction', error);
			}
		}, 500);
	};

	const handleCategoryChange = async (rowIndex: number, rawValue: string) => {
		const transaction = transactions[rowIndex];
		if (!transaction?.id) return;

		const categoryId = rawValue ? Number(rawValue) : null;
		transaction.categoryId = Number.isFinite(categoryId) ? categoryId : null;
		transactions = transactions;

		try {
			await fetch('/api/transactions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(transaction)
			});
		} catch (error) {
			console.error('Failed to update transaction category', error);
		}
	};

	let saveTimeout: NodeJS.Timeout;

	const startEdit = (rowIndex: number, field: keyof Transaction) => {
		editingCell = { rowIndex, field };
	};

	const finishEdit = () => {
		editingCell = null;
	};

	const displayTransactionDateTime = (value: string) => value.split('|')[0] ?? value;
</script>

<div>
	{#if transactions.length > 0}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Own Account Name</th>
						<th>Transaction Date Time</th>
						<th>Partner Name</th>
						<th>Category</th>
						<th>Amount</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each transactions as transaction, i (transaction.transactionDateTime)}
						<tr>
							<td class="editable" ondblclick={() => startEdit(i, 'ownAccountName')}>
								{#if editingCell?.rowIndex === i && editingCell?.field === 'ownAccountName'}
									<input
										type="text"
										value={transaction.ownAccountName}
										onblur={finishEdit}
										oninput={(e) => handleCellEdit(i, 'ownAccountName', e.currentTarget.value)}
										onkeydown={(e) => e.key === 'Enter' && finishEdit()}
									/>
								{:else}
									{transaction.ownAccountName}
								{/if}
							</td>
							<td class="editable" ondblclick={() => startEdit(i, 'transactionDateTime')}>
								{#if editingCell?.rowIndex === i && editingCell?.field === 'transactionDateTime'}
									<input
										type="text"
										value={transaction.transactionDateTime}
										onblur={finishEdit}
										oninput={(e) => handleCellEdit(i, 'transactionDateTime', e.currentTarget.value)}
										onkeydown={(e) => e.key === 'Enter' && finishEdit()}
									/>
								{:else}
									{displayTransactionDateTime(transaction.transactionDateTime)}
								{/if}
							</td>
							<td class="editable" ondblclick={() => startEdit(i, 'partnerName')}>
								{#if editingCell?.rowIndex === i && editingCell?.field === 'partnerName'}
									<input
										type="text"
										value={transaction.partnerName}
										onblur={finishEdit}
										oninput={(e) => handleCellEdit(i, 'partnerName', e.currentTarget.value)}
										onkeydown={(e) => e.key === 'Enter' && finishEdit()}
									/>
								{:else}
									{transaction.partnerName}
								{/if}
							</td>
							<td class="category-cell">
								<select
									value={transaction.categoryId ?? ''}
									onchange={(e) => handleCategoryChange(i, e.currentTarget.value)}
									disabled={categoriesLoading}
								>
									<option value="">Uncategorized</option>
									{#each categories as category (category.id)}
										<option value={category.id}>{category.name}</option>
									{/each}
								</select>
							</td>
							<td class="amount editable" ondblclick={() => startEdit(i, 'amount')}>
								{#if editingCell?.rowIndex === i && editingCell?.field === 'amount'}
									<input
										type="text"
										value={transaction.amount}
										onblur={finishEdit}
										oninput={(e) => handleCellEdit(i, 'amount', e.currentTarget.value)}
										onkeydown={(e) => e.key === 'Enter' && finishEdit()}
									/>
								{:else}
									{transaction.amount}
								{/if}
							</td>
							<td class="actions">
								<button class="delete-btn" onclick={() => deleteRow(i)} title="Delete row">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="3 6 5 6 21 6"></polyline>
										<path
											d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
										></path>
									</svg>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="empty-state">
			<p>No transactions loaded. Upload a CSV file to get started.</p>
		</div>
	{/if}
</div>

<style>
	.table-container {
		background: #1e293b;
		border-radius: 0.75rem;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		border: 1px solid #334155;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
		color: white;
	}

	th {
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	tbody tr {
		border-bottom: 1px solid #334155;
		transition: background-color 0.2s;
	}

	tbody tr:hover {
		background-color: #334155;
	}

	tbody tr:last-child {
		border-bottom: none;
	}

	td {
		padding: 1rem;
		color: #cbd5e1;
		font-size: 0.95rem;
	}

	td.editable {
		cursor: pointer;
		position: relative;
		transition: background-color 0.15s;
	}

	td.editable:hover::after {
		content: '✎';
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		color: #8b5cf6;
		font-size: 0.875rem;
		opacity: 0.6;
	}

	td input {
		width: 100%;
		background: #0f172a;
		border: 2px solid #8b5cf6;
		border-radius: 0.25rem;
		padding: 0.5rem;
		color: #e2e8f0;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
	}

	td.category-cell select {
		width: 100%;
		background: #0f172a;
		border: 2px solid #8b5cf6;
		border-radius: 0.25rem;
		padding: 0.5rem;
		color: #e2e8f0;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
	}

	td.category-cell select:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	td.amount {
		font-weight: 600;
		font-family: 'Courier New', monospace;
		color: #a5f3fc;
	}

	td.actions {
		text-align: center;
		width: 80px;
	}

	.delete-btn {
		background: transparent;
		border: none;
		color: #f87171;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.375rem;
		transition:
			background-color 0.2s,
			transform 0.15s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.delete-btn:hover {
		background-color: rgba(248, 113, 113, 0.1);
		transform: scale(1.1);
	}

	.delete-btn:active {
		transform: scale(0.95);
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: #94a3b8;
		font-size: 1.125rem;
		background: #1e293b;
		border-radius: 0.75rem;
		border: 1px dashed #334155;
	}

	@media (max-width: 768px) {
		table {
			font-size: 0.875rem;
		}

		th,
		td {
			padding: 0.75rem 0.5rem;
		}
	}
</style>
