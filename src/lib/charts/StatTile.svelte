<script lang="ts">
	import { formatNumber } from '$lib/banking/categoryUtils';
	import Sparkline from './Sparkline.svelte';

	interface Props {
		label: string;
		value: number;
		previous?: number | null;
		goodDirection?: 'up' | 'down';
		spark?: number[];
	}

	let { label, value, previous = null, goodDirection = 'down', spark = [] }: Props = $props();

	const delta = $derived(previous === null ? null : value - previous);
	const deltaPct = $derived(
		previous === null || previous === 0 ? null : ((value - previous) / Math.abs(previous)) * 100
	);

	const tone = $derived.by(() => {
		if (delta === null || delta === 0) return 'flat';
		const up = delta > 0;
		return (goodDirection === 'up') === up ? 'good' : 'bad';
	});
</script>

<div class="stat-tile">
	<span class="label">{label}</span>
	<span class="value">{formatNumber(Math.round(value))}</span>

	<div class="foot">
		{#if delta !== null}
			<span class="delta {tone}">
				{delta > 0 ? '▲' : delta < 0 ? '▼' : ''}
				{formatNumber(Math.abs(Math.round(delta)))}
				{#if deltaPct !== null}
					<span class="pct">({deltaPct > 0 ? '+' : ''}{Math.round(deltaPct)}%)</span>
				{/if}
			</span>
			<span class="vs">vs last month</span>
		{:else}
			<span class="vs">no prior month</span>
		{/if}
	</div>

	{#if spark.length > 1}
		<div class="spark"><Sparkline values={spark} /></div>
	{/if}
</div>

<style>
	.stat-tile {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1rem;
		background: var(--chart-surface);
		border: 1px solid var(--chart-grid);
		border-radius: 0.75rem;
	}

	.label {
		font-size: 0.85rem;
		color: var(--chart-muted);
	}

	.value {
		font-size: 1.65rem;
		font-weight: 600;
		color: var(--chart-ink);
		line-height: 1.1;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem;
		font-size: 0.8rem;
	}

	.delta {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.delta.good {
		color: var(--pos);
	}

	.delta.bad {
		color: var(--neg);
	}

	.delta.flat {
		color: var(--chart-muted);
	}

	.pct {
		font-weight: 400;
		opacity: 0.85;
	}

	.vs {
		color: var(--chart-muted);
	}

	.spark {
		margin-top: 0.35rem;
	}
</style>
