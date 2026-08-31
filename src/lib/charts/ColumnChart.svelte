<script lang="ts">
	import { formatNumber } from '$lib/banking/categoryUtils';
	import { compactNumber } from './chartUtils';

	export type ColumnGroup = {
		label: string;
		bars: { key: string; value: number; color: string }[];
	};

	interface Props {
		groups: ColumnGroup[];
		series?: { key: string; label: string }[];
		/** Full value formatting, used in the hover readout. */
		format?: (value: number) => string;
		/** Compact formatting for axis ticks. */
		tickFormat?: (value: number) => string;
		height?: number;
	}

	let {
		groups,
		series = [],
		format = (value: number) => formatNumber(Math.round(value)),
		tickFormat = compactNumber,
		height = 260
	}: Props = $props();

	let plotWidth = $state(640);

	const PAD = { top: 12, right: 12, bottom: 26, left: 44 };
	const MAX_BAR = 22;
	const BAR_GAP = 2;

	const innerW = $derived(Math.max(0, plotWidth - PAD.left - PAD.right));
	const innerH = $derived(Math.max(0, height - PAD.top - PAD.bottom));

	const allValues = $derived(groups.flatMap((g) => g.bars.map((b) => b.value)));
	const rawMax = $derived(Math.max(0, ...allValues));
	const rawMin = $derived(Math.min(0, ...allValues));

	const niceMax = $derived(niceCeil(rawMax));
	const niceMin = $derived(rawMin < 0 ? -niceCeil(-rawMin) : 0);
	const span = $derived(niceMax - niceMin || 1);

	function niceCeil(value: number): number {
		if (value <= 0) return 0;
		const pow = Math.pow(10, Math.floor(Math.log10(value)));
		const n = value / pow;
		const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
		return step * pow;
	}

	const y = $derived((value: number) => PAD.top + innerH - ((value - niceMin) / span) * innerH);
	const zeroY = $derived(y(0));

	const bandWidth = $derived(groups.length > 0 ? innerW / groups.length : innerW);

	const ticks = $derived.by(() => {
		const count = 4;
		const out: number[] = [];
		for (let i = 0; i <= count; i++) out.push(niceMin + (span / count) * i);
		return out;
	});

	let hovered: { g: number; b: number } | null = $state(null);
	const hoveredData = $derived.by(() => {
		if (!hovered) return null;
		const group = groups[hovered.g];
		const bar = group?.bars[hovered.b];
		if (!group || !bar) return null;
		const seriesLabel = series.find((s) => s.key === bar.key)?.label ?? bar.key;
		return { group: group.label, seriesLabel, value: bar.value, showSeries: series.length > 1 };
	});

	const barLayout = $derived((groupIndex: number, barCount: number) => {
		const groupX = PAD.left + groupIndex * bandWidth;
		const slot = Math.min(MAX_BAR, (bandWidth * 0.7 - BAR_GAP * (barCount - 1)) / barCount);
		const clusterW = slot * barCount + BAR_GAP * (barCount - 1);
		const startX = groupX + (bandWidth - clusterW) / 2;
		return { startX, slot };
	});
</script>

{#if series.length > 1}
	<div class="legend">
		{#each series as s (s.key)}
			{@const color = groups
				.find((g) => g.bars.some((b) => b.key === s.key))
				?.bars.find((b) => b.key === s.key)?.color}
			<span class="legend-item">
				<span class="swatch" style:background={color}></span>
				{s.label}
			</span>
		{/each}
	</div>
{/if}

<div class="wrap" bind:clientWidth={plotWidth}>
	<svg width="100%" {height} viewBox="0 0 {plotWidth} {height}" role="img">
		<!-- gridlines + y ticks -->
		{#each ticks as tick (tick)}
			<line
				x1={PAD.left}
				x2={plotWidth - PAD.right}
				y1={y(tick)}
				y2={y(tick)}
				stroke="var(--chart-grid)"
				stroke-width="1"
			/>
			<text x={PAD.left - 8} y={y(tick) + 3} text-anchor="end" class="tick">{tickFormat(tick)}</text
			>
		{/each}

		<!-- zero baseline emphasised when there are negatives -->
		{#if niceMin < 0}
			<line
				x1={PAD.left}
				x2={plotWidth - PAD.right}
				y1={zeroY}
				y2={zeroY}
				stroke="var(--chart-baseline)"
				stroke-width="1"
			/>
		{/if}

		{#each groups as group, gi (group.label)}
			{@const layout = barLayout(gi, group.bars.length)}
			{#each group.bars as bar, bi (bar.key)}
				{@const x = layout.startX + bi * (layout.slot + BAR_GAP)}
				{@const top = bar.value >= 0 ? y(bar.value) : zeroY}
				{@const h = Math.max(1, Math.abs(y(bar.value) - zeroY))}
				<rect
					{x}
					y={top}
					width={layout.slot}
					height={h}
					rx="3"
					fill={bar.color}
					opacity={hovered && (hovered.g !== gi || hovered.b !== bi) ? 0.55 : 1}
					onpointerenter={() => (hovered = { g: gi, b: bi })}
					onpointerleave={() => (hovered = null)}
					role="presentation"
				/>
			{/each}
			<text
				x={PAD.left + gi * bandWidth + bandWidth / 2}
				y={height - 8}
				text-anchor="middle"
				class="tick">{group.label}</text
			>
		{/each}
	</svg>
</div>

<p class="readout" aria-live="polite">
	{#if hoveredData}
		<strong>{format(hoveredData.value)}</strong>
		· {hoveredData.group}{hoveredData.showSeries ? ` · ${hoveredData.seriesLabel}` : ''}
	{:else}
		Hover a column for its exact value.
	{/if}
</p>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		margin-bottom: 0.75rem;
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

	.wrap {
		position: relative;
		width: 100%;
	}

	svg {
		display: block;
		overflow: visible;
	}

	.tick {
		fill: var(--chart-muted);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
	}

	.readout {
		margin: 0.75rem 0 0;
		font-size: 0.82rem;
		color: var(--chart-muted);
	}

	.readout strong {
		color: var(--chart-ink);
		font-variant-numeric: tabular-nums;
	}
</style>
