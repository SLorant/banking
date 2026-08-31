<script lang="ts">
	import { formatMonthLabel } from '$lib/banking/categoryUtils';

	interface Props {
		/** Month keys (YYYY-MM), newest first. */
		months: string[];
		scope: 'month' | 'year';
		selectedMonth: string;
		selectedYear: string;
	}

	let {
		months,
		scope = $bindable(),
		selectedMonth = $bindable(),
		selectedYear = $bindable()
	}: Props = $props();

	const years = $derived(
		[...new Set(months.map((m) => m.split('-')[0]))].sort((a, b) => b.localeCompare(a))
	);

	// months[] and years[] are newest-first, so +1 = older, -1 = newer.
	const stepMonth = (delta: 1 | -1) => {
		const index = months.indexOf(selectedMonth);
		if (index === -1) return;
		const next = months[index + delta];
		if (next) selectedMonth = next;
	};

	const stepYear = (delta: 1 | -1) => {
		const index = years.indexOf(selectedYear);
		if (index === -1) return;
		const next = years[index + delta];
		if (next) selectedYear = next;
	};

	const setScope = (next: 'month' | 'year') => {
		scope = next;
		if (next === 'year' && selectedMonth) {
			const year = selectedMonth.split('-')[0];
			if (years.includes(year)) selectedYear = year;
		}
	};
</script>

<section class="period-controls">
	<div class="scope-toggle" role="group" aria-label="Chart period">
		<button class:active={scope === 'month'} onclick={() => setScope('month')}>Month</button>
		<button class:active={scope === 'year'} onclick={() => setScope('year')}>Year</button>
	</div>

	{#if scope === 'month'}
		<button
			type="button"
			class="nav-btn"
			onclick={() => stepMonth(1)}
			disabled={months.length === 0 || selectedMonth === months[months.length - 1]}
		>
			Older
		</button>

		<label class="select">
			<span>Month</span>
			<select bind:value={selectedMonth} disabled={months.length === 0}>
				{#each months as monthKey (monthKey)}
					<option value={monthKey}>{formatMonthLabel(monthKey)}</option>
				{/each}
			</select>
		</label>

		<button
			type="button"
			class="nav-btn"
			onclick={() => stepMonth(-1)}
			disabled={months.length === 0 || selectedMonth === months[0]}
		>
			Newer
		</button>

		{#if selectedMonth}
			<span class="current">{formatMonthLabel(selectedMonth)}</span>
		{/if}
	{:else}
		<button
			type="button"
			class="nav-btn"
			onclick={() => stepYear(1)}
			disabled={years.length === 0 || selectedYear === years[years.length - 1]}
		>
			Older
		</button>

		<label class="select">
			<span>Year</span>
			<select bind:value={selectedYear} disabled={years.length === 0}>
				{#each years as year (year)}
					<option value={year}>{year}</option>
				{/each}
			</select>
		</label>

		<button
			type="button"
			class="nav-btn"
			onclick={() => stepYear(-1)}
			disabled={years.length === 0 || selectedYear === years[0]}
		>
			Newer
		</button>

		{#if selectedYear}
			<span class="current">{selectedYear}</span>
		{/if}
	{/if}
</section>

<style>
	.period-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #334155;
		border-radius: 0.75rem;
		background: #1e293b;
	}

	.scope-toggle {
		display: inline-flex;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.scope-toggle button {
		background: #0f172a;
		border: none;
		color: #94a3b8;
		font: inherit;
		font-weight: 600;
		padding: 0.5rem 0.9rem;
		cursor: pointer;
	}

	.scope-toggle button.active {
		background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
		color: #fff;
	}

	.nav-btn {
		border: 1px solid #334155;
		background: #0f172a;
		color: #e2e8f0;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-weight: 600;
	}

	.nav-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.select {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #cbd5e1;
		font-weight: 600;
	}

	.select select {
		background: #0f172a;
		color: #e2e8f0;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		outline: none;
	}

	.select select:focus {
		border-color: #8b5cf6;
	}

	.current {
		margin-left: auto;
		color: #cbd5e1;
		font-weight: 600;
	}
</style>
