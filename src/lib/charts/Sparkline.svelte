<script lang="ts">
	interface Props {
		values: number[];
		width?: number;
		height?: number;
	}

	let { values, width = 96, height = 28 }: Props = $props();

	const points = $derived.by(() => {
		if (values.length < 2) return null;

		const min = Math.min(...values, 0);
		const max = Math.max(...values, 0);
		const span = max - min || 1;
		const stepX = width / (values.length - 1);

		const coords = values.map((value, i) => {
			const x = i * stepX;
			const y = height - ((value - min) / span) * height;
			return [x, y] as const;
		});

		return {
			path: coords
				.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
				.join(' '),
			last: coords[coords.length - 1],
			zeroY: height - ((0 - min) / span) * height
		};
	});
</script>

{#if points}
	<svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true" class="sparkline">
		<line
			x1="0"
			x2={width}
			y1={points.zeroY}
			y2={points.zeroY}
			stroke="var(--chart-baseline)"
			stroke-width="1"
		/>
		<path d={points.path} fill="none" stroke="var(--chart-muted)" stroke-width="1.5" />
		<circle cx={points.last[0]} cy={points.last[1]} r="2.5" fill="var(--series-1)" />
	</svg>
{/if}

<style>
	.sparkline {
		display: block;
		overflow: visible;
	}
</style>
