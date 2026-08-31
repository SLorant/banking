<script lang="ts">
	import { formatNumber } from '$lib/banking/categoryUtils';
	import type { NamedValue } from './chartUtils';

	interface Props {
		bars: NamedValue[];
		color?: string;
		/** Optional: format a value for display. Defaults to a thousands-grouped integer. */
		format?: (value: number) => string;
		emptyText?: string;
	}

	let {
		bars,
		color = 'var(--series-1)',
		format = (value: number) => formatNumber(Math.round(value)),
		emptyText = 'No spending in this period.'
	}: Props = $props();

	const max = $derived(Math.max(0, ...bars.map((b) => b.value)));
	let hovered: number | null = $state(null);
</script>

{#if bars.length === 0}
	<p class="empty">{emptyText}</p>
{:else}
	<div class="bars">
		{#each bars as bar, i (bar.label)}
			<div
				class="row"
				class:hovered={hovered === i}
				role="presentation"
				onpointerenter={() => (hovered = i)}
				onpointerleave={() => (hovered = null)}
			>
				<span class="row-label" title={bar.label}>{bar.label}</span>
				<div class="track">
					<div
						class="fill"
						style:width="{max > 0 ? (bar.value / max) * 100 : 0}%"
						style:background={color}
					></div>
				</div>
				<span class="value">{format(bar.value)}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.empty {
		margin: 0;
		color: var(--chart-muted);
		font-size: 0.9rem;
	}

	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(6rem, 11rem) 1fr auto;
		align-items: center;
		gap: 0.75rem;
		border-radius: 0.35rem;
		transition: background-color 0.12s;
	}

	.row.hovered {
		background: color-mix(in srgb, var(--chart-grid) 55%, transparent);
	}

	.row-label {
		font-size: 0.85rem;
		color: var(--chart-ink-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0.2rem 0 0.2rem 0.3rem;
	}

	.track {
		display: flex;
		align-items: center;
		min-height: 1.5rem;
	}

	.fill {
		height: 0.85rem;
		min-width: 2px;
		border-radius: 0 4px 4px 0;
		transition: filter 0.12s;
	}

	.row.hovered .fill {
		filter: brightness(1.12);
	}

	.value {
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: var(--chart-ink-secondary);
		white-space: nowrap;
	}
</style>
