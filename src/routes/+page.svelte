<script lang="ts">
	import { onMount } from 'svelte';
	import { handleFileUpload, loadTransactions } from './utils';
	import { resolve } from '$app/paths';
	import BankingTable from '$lib/banking/BankingTable.svelte';
	import type { Category, Transaction } from './types';

	let transactions: Transaction[] = $state([]);
	let categories: Category[] = $state([]);
	let fileInput: HTMLInputElement;
	let loading = $state(false);
	let saveStatus = $state('');
	let newCategoryName = $state('');
	let editingCategory: { id: number; name: string } | null = $state(null);
	let categoriesLoading = $state(false);

	// Load transactions from database on mount
	onMount(async () => {
		({ transactions, loading, saveStatus } = await loadTransactions(
			transactions,
			loading,
			saveStatus
		));
		await loadCategories();
	});

	const loadCategories = async () => {
		categoriesLoading = true;
		try {
			const response = await fetch('/api/categories');
			if (response.ok) {
				categories = await response.json();
			}
		} catch (error) {
			console.error('Failed to load categories', error);
		} finally {
			categoriesLoading = false;
		}
	};

	const createCategory = async () => {
		const name = newCategoryName.trim();
		if (!name) return;

		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (response.ok) {
				newCategoryName = '';
				await loadCategories();
			} else {
				const payload = await response.json().catch(() => null);
				saveStatus = payload?.error ?? 'Failed to create category';
			}
		} catch (error) {
			console.error('Failed to create category', error);
			saveStatus = 'Failed to create category';
		}
	};

	const startCategoryEdit = (category: Category) => {
		editingCategory = { id: category.id, name: category.name };
	};

	const cancelCategoryEdit = () => {
		editingCategory = null;
	};

	const saveCategoryEdit = async () => {
		if (!editingCategory) return;
		const name = editingCategory.name.trim();
		if (!name) return;

		try {
			const response = await fetch('/api/categories', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: editingCategory.id, name })
			});

			if (response.ok) {
				editingCategory = null;
				await loadCategories();
			} else {
				const payload = await response.json().catch(() => null);
				saveStatus = payload?.error ?? 'Failed to update category';
			}
		} catch (error) {
			console.error('Failed to update category', error);
			saveStatus = 'Failed to update category';
		}
	};

	const deleteCategory = async (id: number) => {
		try {
			const response = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
			if (response.ok) {
				await loadCategories();
				// Category deletion unassigns transactions server-side; reload to reflect.
				({ transactions, loading, saveStatus } = await loadTransactions(
					transactions,
					loading,
					saveStatus
				));
			} else {
				const payload = await response.json().catch(() => null);
				saveStatus = payload?.error ?? 'Failed to delete category';
			}
		} catch (error) {
			console.error('Failed to delete category', error);
			saveStatus = 'Failed to delete category';
		}
	};

	const triggerFileInput = () => {
		fileInput.click();
	};
</script>

<div class="banking-page">
	<div class="page-header">
		<h1>Banking Dashboard</h1>
		<a href={resolve('/banking/categories')} class="nav-link">View Category Spending</a>
	</div>

	<div class="upload-section">
		<input
			type="file"
			accept=".csv"
			bind:this={fileInput}
			onchange={(e) => handleFileUpload(e, loading, saveStatus)}
			style="display: none;"
		/>
		<button class="upload-btn" onclick={triggerFileInput} disabled={loading}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="17 8 12 3 7 8"></polyline>
				<line x1="12" y1="3" x2="12" y2="15"></line>
			</svg>
			{loading ? 'Processing...' : 'Upload CSV'}
		</button>
		{#if saveStatus}
			<span class="save-status">{saveStatus}</span>
		{/if}
	</div>

	<div class="categories-section">
		<h2>Categories</h2>

		<div class="category-form">
			<input
				type="text"
				placeholder="Add a category (e.g. mortgage, food)"
				value={newCategoryName}
				oninput={(e) => (newCategoryName = e.currentTarget.value)}
				onkeydown={(e) => e.key === 'Enter' && createCategory()}
				disabled={categoriesLoading}
			/>
			<button
				class="category-btn"
				onclick={createCategory}
				disabled={categoriesLoading || !newCategoryName.trim()}
			>
				Add
			</button>
		</div>

		{#if categories.length > 0}
			<div class="categories-list">
				{#each categories as category (category.id)}
					<div class="category-row">
						{#if editingCategory?.id === category.id}
							<input
								type="text"
								value={editingCategory.name}
								oninput={(e) =>
									(editingCategory = { id: editingCategory!.id, name: e.currentTarget.value })}
								onkeydown={(e) => {
									if (e.key === 'Enter') saveCategoryEdit();
									if (e.key === 'Escape') cancelCategoryEdit();
								}}
							/>
							<div class="category-actions">
								<button class="category-btn secondary" onclick={saveCategoryEdit}>Save</button>
								<button class="category-btn secondary" onclick={cancelCategoryEdit}>Cancel</button>
							</div>
						{:else}
							<span class="category-name">
								{category.name}
							</span>
							<div class="category-actions">
								<button class="category-btn secondary" onclick={() => startCategoryEdit(category)}>
									Rename
								</button>
								<button
									class="delete-btn"
									onclick={() => deleteCategory(category.id)}
									title="Delete category"
								>
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
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="categories-empty">No categories yet.</p>
		{/if}
	</div>

	<BankingTable {categories} {categoriesLoading} bind:loading bind:transactions />
</div>

<style>
	:global(body) {
		background-color: #0f172a;
		color: #e2e8f0;
	}

	.banking-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0;
		color: #f1f5f9;
		text-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0;
		color: #f1f5f9;
		text-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
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

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 1rem;
		color: #f1f5f9;
	}

	.upload-section {
		margin-bottom: 2rem;
	}

	.categories-section {
		margin-bottom: 2rem;
		background: #1e293b;
		border-radius: 0.75rem;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		border: 1px solid #334155;
		padding: 1.5rem;
	}

	.category-form {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.category-form input {
		flex: 1;
		background: #0f172a;
		border: 2px solid #334155;
		border-radius: 0.5rem;
		padding: 0.75rem;
		color: #e2e8f0;
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.category-form input:focus {
		border-color: #8b5cf6;
	}

	.category-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: white;
		background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
	}

	.category-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 20px rgba(139, 92, 246, 0.35);
	}

	.category-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.category-btn.secondary {
		background: #334155;
		box-shadow: none;
	}

	.category-btn.secondary:hover {
		transform: none;
		box-shadow: none;
	}

	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.category-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		background: #0f172a;
	}

	.category-row input {
		flex: 1;
		background: transparent;
		border: 2px solid #8b5cf6;
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		color: #e2e8f0;
		font-size: 1rem;
		font-family: inherit;
		outline: none;
	}

	.category-name {
		flex: 1;
		color: #cbd5e1;
		font-weight: 600;
		cursor: default;
	}

	.category-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.categories-empty {
		margin: 0;
		color: #94a3b8;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: white;
		background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
	}

	.upload-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(139, 92, 246, 0.6);
	}

	.upload-btn:active {
		transform: translateY(0);
	}

	.upload-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.save-status {
		margin-left: 1rem;
		color: #a5f3fc;
		font-weight: 500;
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

	@media (max-width: 768px) {
		.banking-page {
			padding: 1rem;
		}

		h1 {
			font-size: 2rem;
		}
	}
</style>
