<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		/** Column headers for the table view. */
		tableColumns: string[];
		/** Rows for the table view; each cell already formatted for display. */
		tableRows: (string | number)[][];
		children: Snippet;
	}

	let { title, subtitle, tableColumns, tableRows, children }: Props = $props();

	let view: 'chart' | 'table' = $state('chart');
</script>

<figure class="chart-card">
	<figcaption class="chart-head">
		<div>
			<h3>{title}</h3>
			{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
		</div>
		<div class="view-toggle" role="group" aria-label="View as">
			<button class:active={view === 'chart'} onclick={() => (view = 'chart')}>Chart</button>
			<button class:active={view === 'table'} onclick={() => (view = 'table')}>Table</button>
		</div>
	</figcaption>

	{#if view === 'chart'}
		<div class="chart-body">
			{@render children()}
		</div>
	{:else}
		<div class="table-body">
			<table>
				<thead>
					<tr>
						{#each tableColumns as column (column)}
							<th class:num={tableColumns.indexOf(column) > 0}>{column}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each tableRows as row, i (i)}
						<tr>
							{#each row as cell, j (j)}
								<td class:num={j > 0}>{cell}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</figure>

<style>
	.chart-card {
		margin: 0;
		padding: 1.25rem;
		background: var(--chart-surface);
		border: 1px solid var(--chart-grid);
		border-radius: 0.75rem;
	}

	.chart-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--chart-ink);
	}

	.subtitle {
		margin: 0.15rem 0 0;
		font-size: 0.85rem;
		color: var(--chart-muted);
	}

	.view-toggle {
		display: inline-flex;
		border: 1px solid var(--chart-grid);
		border-radius: 0.4rem;
		overflow: hidden;
		flex-shrink: 0;
	}

	.view-toggle button {
		background: transparent;
		border: none;
		color: var(--chart-muted);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.3rem 0.65rem;
		cursor: pointer;
	}

	.view-toggle button.active {
		background: var(--chart-grid);
		color: var(--chart-ink);
	}

	.table-body {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--chart-grid);
		color: var(--chart-ink-secondary);
	}

	th {
		color: var(--chart-muted);
		font-weight: 600;
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
</style>
