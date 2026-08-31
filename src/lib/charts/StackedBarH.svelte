<script lang="ts">
	import { formatNumber } from '$lib/banking/categoryUtils';
	import type { StackedRow, StackKey } from './chartUtils';

	interface Props {
		rows: StackedRow[];
		keys: StackKey[];
		rowLabel: (monthKey: string) => string;
		format?: (value: number) => string;
	}

	let {
		rows,
		keys,
		rowLabel,
		format = (value: number) => formatNumber(Math.round(value))
	}: Props = $props();

	const max = $derived(Math.max(0, ...rows.map((r) => r.total)));

	let readout: { row: string; key: string; value: number; pct: number } | null = $state(null);

	const hover = (row: StackedRow, key: StackKey) => {
		const value = row.segments[key.key] ?? 0;
		readout = {
			row: rowLabel(row.monthKey),
			key: key.label,
			value,
			pct: row.total > 0 ? (value / row.total) * 100 : 0
		};
	};
</script>

<div class="legend">
	{#each keys as key (key.key)}
		<span class="legend-item">
			<span class="swatch" style:background={key.color}></span>
			{key.label}
		</span>
	{/each}
</div>

<div class="rows">
	{#each rows as row (row.monthKey)}
		<div class="row">
			<span class="row-label">{rowLabel(row.monthKey)}</span>
			<div class="track" role="presentation" onpointerleave={() => (readout = null)}>
				{#if row.total === 0}
					<span class="row-empty">—</span>
				{:else}
					{#each keys as key (key.key)}
						{@const value = row.segments[key.key] ?? 0}
						{#if value > 0}
							<div
								class="segment"
								style:width="{(value / max) * 100}%"
								style:background={key.color}
								onpointerenter={() => hover(row, key)}
								role="presentation"
							></div>
						{/if}
					{/each}
				{/if}
			</div>
			<span class="row-total">{format(row.total)}</span>
		</div>
	{/each}
</div>

<p class="readout" aria-live="polite">
	{#if readout}
		<strong>{format(readout.value)}</strong>
		· {readout.row} · {readout.key} · {Math.round(readout.pct)}% of month
	{:else}
		Hover a segment for its share of the month.
	{/if}
</p>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		margin-bottom: 0.9rem;
		font-size: 0.8rem;
		color: var(--chart-ink-secondary);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.swatch {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 0.2rem;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.row {
		display: grid;
		grid-template-columns: 5.5rem 1fr 4.5rem;
		align-items: center;
		gap: 0.6rem;
	}

	.row-label {
		font-size: 0.8rem;
		color: var(--chart-muted);
		white-space: nowrap;
	}

	.track {
		display: flex;
		gap: 2px;
		min-height: 1.35rem;
		align-items: center;
	}

	.segment {
		height: 1.1rem;
		min-width: 2px;
		border-radius: 2px;
		transition: filter 0.12s;
	}

	.segment:hover {
		filter: brightness(1.15);
	}

	.row-empty {
		color: var(--chart-muted);
		font-size: 0.85rem;
	}

	.row-total {
		font-size: 0.8rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--chart-ink-secondary);
	}

	.readout {
		margin: 1rem 0 0;
		font-size: 0.82rem;
		color: var(--chart-muted);
	}

	.readout strong {
		color: var(--chart-ink);
		font-variant-numeric: tabular-nums;
	}
</style>
