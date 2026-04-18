import { json } from '@sveltejs/kit';
import { categoryDb, transactionDb } from '$lib/db';
import type { Transaction } from '$lib/db';
import type { RequestHandler } from './$types';

type TransactionImportPayload = {
	ownAccountName?: unknown;
	transactionDateTime?: unknown;
	partnerName?: unknown;
	amount?: unknown;
	categoryId?: unknown;
	categoryName?: unknown;
	category?: unknown;
};

const normalizeCategoryName = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const name = value.trim();
	if (!name) return null;
	const lower = name.toLowerCase();
	if (lower === 'uncategorised' || lower === 'uncategorized') return null;
	return name;
};

const asTrimmedString = (value: unknown): string => {
	if (typeof value === 'string') return value.trim();
	if (value === null || value === undefined) return '';
	return String(value).trim();
};

// GET - Retrieve all transactions
export const GET: RequestHandler = async () => {
	try {
		const transactions = transactionDb.getAll();
		return json(transactions);
	} catch (error) {
		console.error('Error fetching transactions:', error);
		return json({ error: 'Failed to fetch transactions' }, { status: 500 });
	}
};

// POST - Create new transaction(s) or bulk import
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const categoryIdCache: Record<string, number> = {};

		const resolveCategoryId = (rawName: string): number => {
			const key = rawName.trim().toLowerCase();
			if (!key) return 0;
			if (categoryIdCache[key]) return categoryIdCache[key];
			const id = categoryDb.getOrCreate(rawName);
			categoryIdCache[key] = id;
			return id;
		};

		// Check if it's a bulk import (array) or single transaction
		if (Array.isArray(body)) {
			const transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> = [];
			for (const raw of body as TransactionImportPayload[]) {
				if (!raw || typeof raw !== 'object') continue;

				const ownAccountName = asTrimmedString(raw.ownAccountName);
				const transactionDateTime = asTrimmedString(raw.transactionDateTime);
				const partnerName = asTrimmedString(raw.partnerName);
				const amount = asTrimmedString(raw.amount);
				if (!transactionDateTime) continue;

				let categoryId: number | null = null;
				const rawCategoryId = Number(raw.categoryId);
				if (Number.isInteger(rawCategoryId) && rawCategoryId > 0) {
					categoryId = rawCategoryId;
				} else {
					const name = normalizeCategoryName(raw.categoryName ?? raw.category);
					if (name) categoryId = resolveCategoryId(name);
				}

				transactions.push({
					ownAccountName,
					transactionDateTime,
					partnerName,
					amount,
					categoryId
				});
			}

			const count = transactionDb.bulkCreate(transactions);
			return json({ success: true, count, message: `${count} transactions imported` });
		} else {
			const payload = body as TransactionImportPayload;
			const ownAccountName = asTrimmedString(payload?.ownAccountName);
			const transactionDateTime = asTrimmedString(payload?.transactionDateTime);
			const partnerName = asTrimmedString(payload?.partnerName);
			const amount = asTrimmedString(payload?.amount);
			if (!transactionDateTime) {
				return json({ error: 'transactionDateTime is required' }, { status: 400 });
			}

			let categoryId: number | null = null;
			const rawCategoryId = Number(payload?.categoryId);
			if (Number.isInteger(rawCategoryId) && rawCategoryId > 0) {
				categoryId = rawCategoryId;
			} else {
				const name = normalizeCategoryName(payload?.categoryName ?? payload?.category);
				if (name) categoryId = resolveCategoryId(name);
			}

			const id = transactionDb.create({
				ownAccountName,
				transactionDateTime,
				partnerName,
				amount,
				categoryId
			});
			const transaction = transactionDb.getById(id);
			return json(transaction, { status: 201 });
		}
	} catch (error) {
		console.error('Error creating transaction:', error);
		return json({ error: 'Failed to create transaction' }, { status: 500 });
	}
};

// PUT - Update a transaction
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const { id, ...transaction } = await request.json();

		if (!id) {
			return json({ error: 'Transaction ID is required' }, { status: 400 });
		}

		const success = transactionDb.update(id, transaction);

		if (!success) {
			return json({ error: 'Transaction not found' }, { status: 404 });
		}

		const updated = transactionDb.getById(id);
		return json(updated);
	} catch (error) {
		console.error('Error updating transaction:', error);
		return json({ error: 'Failed to update transaction' }, { status: 500 });
	}
};

// DELETE - Delete a transaction or all transactions
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const url = new URL(request.url);
		const id = url.searchParams.get('id');

		if (id === 'all') {
			const count = transactionDb.deleteAll();
			return json({ success: true, count, message: `${count} transactions deleted` });
		} else if (id) {
			const success = transactionDb.delete(parseInt(id));

			if (!success) {
				return json({ error: 'Transaction not found' }, { status: 404 });
			}

			return json({ success: true, message: 'Transaction deleted' });
		} else {
			return json({ error: 'Transaction ID is required' }, { status: 400 });
		}
	} catch (error) {
		console.error('Error deleting transaction:', error);
		return json({ error: 'Failed to delete transaction' }, { status: 500 });
	}
};
