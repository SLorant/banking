<script lang="ts">
	import { formatMonthLabel } from '$lib/banking/categoryUtils';

	interface Props {
		months: string[];
		selectedMonth: string;
	}

	let { months, selectedMonth = $bindable() }: Props = $props();

	const goToOlderMonth = () => {
		const index = months.indexOf(selectedMonth);
		if (index === -1) return;
		selectedMonth = months[index + 1] ?? selectedMonth;
	};

	const goToNewerMonth = () => {
		const index = months.indexOf(selectedMonth);
		if (index <= 0) return;
		selectedMonth = months[index - 1] ?? selectedMonth;
	};
</script>

<section class="month-controls">
	<button
		type="button"
		class="nav-btn"
		onclick={goToOlderMonth}
		disabled={months.length === 0 || selectedMonth === months[months.length - 1]}
	>
		Older
	</button>

	<label class="month-select">
		<span>Month</span>
		<select class="month-dropdown" bind:value={selectedMonth} disabled={months.length === 0}>
			{#each months as monthKey (monthKey)}
				<option value={monthKey}>{formatMonthLabel(monthKey)}</option>
			{/each}
		</select>
	</label>

	<button
		type="button"
		class="nav-btn"
		onclick={goToNewerMonth}
		disabled={months.length === 0 || selectedMonth === months[0]}
	>
		Newer
	</button>

	{#if selectedMonth}
		<span class="current-month">{formatMonthLabel(selectedMonth)}</span>
	{/if}
</section>

<style>
	.month-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #334155;
		border-radius: 0.75rem;
		background: #1e293b;
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

	.month-select {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #cbd5e1;
		font-weight: 600;
	}

	.month-dropdown {
		background: #0f172a;
		color: #e2e8f0;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		outline: none;
	}

	.month-dropdown:focus {
		border-color: #8b5cf6;
	}

	.current-month {
		margin-left: auto;
		color: #cbd5e1;
		font-weight: 600;
	}
</style>
