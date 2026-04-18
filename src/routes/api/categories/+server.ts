import { json } from '@sveltejs/kit';
import { categoryDb } from '$lib/db';
import type { RequestHandler } from './$types';

const isUniqueConstraint = (error: unknown) => {
	if (!error || typeof error !== 'object') return false;
	const code = (error as { code?: unknown }).code;
	return code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY';
};

// GET - Retrieve all categories
export const GET: RequestHandler = async () => {
	try {
		const categories = categoryDb.getAll();
		return json(categories);
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json({ error: 'Failed to fetch categories' }, { status: 500 });
	}
};

// POST - Create a new category
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const name = typeof body?.name === 'string' ? body.name.trim() : '';

		if (!name) {
			return json({ error: 'Category name is required' }, { status: 400 });
		}

		try {
			const id = categoryDb.create(name);
			const created = categoryDb.getById(id);
			return json(created, { status: 201 });
		} catch (error) {
			if (isUniqueConstraint(error)) {
				return json({ error: 'Category already exists' }, { status: 409 });
			}
			throw error;
		}
	} catch (error) {
		console.error('Error creating category:', error);
		return json({ error: 'Failed to create category' }, { status: 500 });
	}
};

// PUT - Rename a category
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const id = Number(body?.id);
		const name = typeof body?.name === 'string' ? body.name.trim() : '';

		if (!Number.isInteger(id) || id <= 0) {
			return json({ error: 'Category ID is required' }, { status: 400 });
		}

		if (!name) {
			return json({ error: 'Category name is required' }, { status: 400 });
		}

		try {
			const success = categoryDb.update(id, name);
			if (!success) {
				return json({ error: 'Category not found' }, { status: 404 });
			}
			const updated = categoryDb.getById(id);
			return json(updated);
		} catch (error) {
			if (isUniqueConstraint(error)) {
				return json({ error: 'Category already exists' }, { status: 409 });
			}
			throw error;
		}
	} catch (error) {
		console.error('Error updating category:', error);
		return json({ error: 'Failed to update category' }, { status: 500 });
	}
};

// DELETE - Delete a category (and unassign it from transactions)
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const url = new URL(request.url);
		const idParam = url.searchParams.get('id');

		if (!idParam) {
			return json({ error: 'Category ID is required' }, { status: 400 });
		}

		const id = Number(idParam);
		if (!Number.isInteger(id) || id <= 0) {
			return json({ error: 'Category ID must be a positive integer' }, { status: 400 });
		}

		const success = categoryDb.delete(id);
		if (!success) {
			return json({ error: 'Category not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting category:', error);
		return json({ error: 'Failed to delete category' }, { status: 500 });
	}
};
