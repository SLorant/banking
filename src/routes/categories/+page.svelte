<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import MonthControls from '$lib/banking/MonthControls.svelte';
	import MonthSummary from '$lib/banking/MonthSummary.svelte';
	import CategorySpendingLists from '$lib/banking/CategorySpendingLists.svelte';
	import YearlySummaries from '$lib/banking/YearlySummaries.svelte';
	import {
		buildMonths,
		buildCategoryRows,
		calculateMonthAggregate,
		calculateYearlySummaries,
		type YearAggregate
	} from '$lib/banking/categoryUtils';
	import type { Transaction, Category } from '../types';

	let transactions: Transaction[] = $state([]);
	let categories: Category[] = $state([]);
	let months: string[] = $state([]);
	let selectedMonth = $state('');
	let yearlySummaries: YearAggregate[] = $state([]);

	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		loading = true;
		error = '';
		try {
			const [txResponse, categoryResponse] = await Promise.all([
				fetch('/api/transactions'),
				fetch('/api/categories')
			]);

			if (!txResponse.ok) throw new Error('Failed to fetch transactions');
			if (!categoryResponse.ok) throw new Error('Failed to fetch categories');

			transactions = await txResponse.json();
			categories = await categoryResponse.json();

			months = buildMonths(transactions);
			selectedMonth = months[0] ?? '';
			yearlySummaries = calculateYearlySummaries(() => transactions);
		} catch (e) {
			console.error(e);
			error = 'Failed to load category breakdown.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="category-page">
	<div class="category-container">
		<header class="page-header">
			<h1>Category Spending</h1>
			<a href={resolve('/banking')} class="nav-link">Back to Banking</a>
		</header>

		<MonthControls bind:selectedMonth {months} />

		{#if loading}
			<div class="panel">Loading…</div>
		{:else if error}
			<div class="panel error">{error}</div>
		{:else if categories.length === 0}
			<div class="panel">No categories yet.</div>
		{:else if !selectedMonth}
			<div class="panel">No transactions found.</div>
		{:else}
			{@const rows = buildCategoryRows(categories, transactions, selectedMonth)}
			{@const spendingRows = rows.filter((r) => r.spend > 0 && r.income === 0)}
			{@const incomeRows = rows.filter((r) => r.income > 0 && r.spend === 0)}
			{@const mixedRows = rows.filter((r) => r.income > 0 && r.spend > 0)}
			{@const aggregate = calculateMonthAggregate(transactions, selectedMonth)}

			<CategorySpendingLists {spendingRows} {incomeRows} {mixedRows} />

			<MonthSummary {aggregate} />

			<YearlySummaries {yearlySummaries} />
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background-color: #0f172a;
		color: #e2e8f0;
	}

	.category-page {
		min-height: 100vh;
	}

	.category-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header h1 {
		font-size: 2.25rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0;
	}

	.nav-link {
		color: #a5f3fc;
		font-weight: 500;
		text-decoration: none;
		transition: color 0.2s;
	}

	.nav-link:hover {
		color: #8b5cf6;
		text-decoration: underline;
	}

	.panel {
		padding: 1.5rem;
		border: 1px solid #334155;
		border-radius: 0.75rem;
		background: #1e293b;
		color: #cbd5e1;
	}

	.panel.error {
		border-color: #f87171;
		background: rgba(248, 113, 113, 0.08);
		color: #fecaca;
	}

	@media (max-width: 768px) {
		.category-container {
			padding: 1rem;
		}

		.page-header h1 {
			font-size: 2rem;
		}
	}
</style>
