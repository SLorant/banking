import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'banking.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create transactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		transaction_date_time TEXT NOT NULL UNIQUE,
    own_account_name TEXT NOT NULL,
    partner_name TEXT NOT NULL,
    amount TEXT NOT NULL,
		category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create index for faster queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_transaction_date 
  ON transactions(transaction_date_time)
`);

// Categories
db.exec(`
	CREATE TABLE IF NOT EXISTS categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)
`);

// Add category_id column to existing DBs (safe migration)
const transactionColumns = db.prepare("PRAGMA table_info('transactions')").all() as Array<{
	name: string;
}>;
if (!transactionColumns.some((col) => col.name === 'category_id')) {
	db.exec('ALTER TABLE transactions ADD COLUMN category_id INTEGER');
}

db.exec(`
	CREATE INDEX IF NOT EXISTS idx_transactions_category_id
	ON transactions(category_id)
`);

export interface Category {
	id: number;
	name: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface Transaction {
	id?: number;
	ownAccountName: string;
	transactionDateTime: string;
	partnerName: string;
	amount: string;
	categoryId?: number | null;
	createdAt?: string;
	updatedAt?: string;
}

// Prepared statements for better performance
const statements = {
	getAll: db.prepare(`
    SELECT 
      id,
      own_account_name as ownAccountName,
      transaction_date_time as transactionDateTime,
      partner_name as partnerName,
      amount,
			category_id as categoryId,
      created_at as createdAt,
      updated_at as updatedAt
    FROM transactions
    ORDER BY transaction_date_time DESC
  `),

	getByDateTime: db.prepare(`
		SELECT 
			id,
			own_account_name as ownAccountName,
			transaction_date_time as transactionDateTime,
			partner_name as partnerName,
			amount,
			category_id as categoryId,
			created_at as createdAt,
			updated_at as updatedAt
		FROM transactions
		WHERE transaction_date_time = ?
	`),

	getById: db.prepare(`
    SELECT 
      id,
      own_account_name as ownAccountName,
      transaction_date_time as transactionDateTime,
      partner_name as partnerName,
      amount,
			category_id as categoryId,
      created_at as createdAt,
      updated_at as updatedAt
    FROM transactions
    WHERE id = ?
  `),

	insert: db.prepare(`
		INSERT OR IGNORE INTO transactions (
      own_account_name,
      transaction_date_time,
      partner_name,
			amount,
			category_id
		) VALUES (?, ?, ?, ?, ?)
  `),

	update: db.prepare(`
    UPDATE transactions 
    SET 
      own_account_name = ?,
      transaction_date_time = ?,
      partner_name = ?,
      amount = ?,
			category_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

	delete: db.prepare(`
    DELETE FROM transactions WHERE id = ?
  `),

	deleteAll: db.prepare(`
    DELETE FROM transactions
  `)
};

const categoryStatements = {
	getAll: db.prepare(`
		SELECT
			id,
			name,
			created_at as createdAt,
			updated_at as updatedAt
		FROM categories
		ORDER BY name COLLATE NOCASE ASC
	`),

	getById: db.prepare(`
		SELECT
			id,
			name,
			created_at as createdAt,
			updated_at as updatedAt
		FROM categories
		WHERE id = ?
	`),

	getByName: db.prepare(`
		SELECT
			id,
			name,
			created_at as createdAt,
			updated_at as updatedAt
		FROM categories
		WHERE name = ? COLLATE NOCASE
	`),

	insert: db.prepare(`
		INSERT INTO categories (name)
		VALUES (?)
	`),

	update: db.prepare(`
		UPDATE categories
		SET name = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`),

	clearCategoryFromTransactions: db.prepare(`
		UPDATE transactions
		SET category_id = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE category_id = ?
	`),

	delete: db.prepare(`
		DELETE FROM categories
		WHERE id = ?
	`)
};

export const transactionDb = {
	// Get all transactions
	getAll(): Transaction[] {
		return statements.getAll.all() as Transaction[];
	},

	// Get transaction by ID
	getById(id: number): Transaction | undefined {
		return statements.getById.get(id) as Transaction | undefined;
	},

	// Create a new transaction
	create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): number {
		const result = statements.insert.run(
			transaction.ownAccountName,
			transaction.transactionDateTime,
			transaction.partnerName,
			transaction.amount,
			transaction.categoryId ?? null
		);

		if (result.changes === 0) {
			const existing = statements.getByDateTime.get(transaction.transactionDateTime) as
				| Transaction
				| undefined;
			return existing?.id ?? 0;
		}

		return result.lastInsertRowid as number;
	},

	// Bulk insert transactions (for CSV imports)
	bulkCreate(transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]): number {
		const insertMany = db.transaction((txs: typeof transactions) => {
			let insertedCount = 0;
			for (const tx of txs) {
				const result = statements.insert.run(
					tx.ownAccountName,
					tx.transactionDateTime,
					tx.partnerName,
					tx.amount,
					tx.categoryId ?? null
				);
				insertedCount += result.changes;
			}
			return insertedCount;
		});

		return insertMany(transactions);
	},

	// Update a transaction
	update(id: number, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): boolean {
		const result = statements.update.run(
			transaction.ownAccountName,
			transaction.transactionDateTime,
			transaction.partnerName,
			transaction.amount,
			transaction.categoryId ?? null,
			id
		);
		return result.changes > 0;
	},

	// Delete a transaction
	delete(id: number): boolean {
		const result = statements.delete.run(id);
		return result.changes > 0;
	},

	// Delete all transactions
	deleteAll(): number {
		const result = statements.deleteAll.run();
		return result.changes;
	},

	// Close database connection
	close() {
		db.close();
	}
};

export const categoryDb = {
	getAll(): Category[] {
		return categoryStatements.getAll.all() as Category[];
	},

	getById(id: number): Category | undefined {
		return categoryStatements.getById.get(id) as Category | undefined;
	},

	getByName(name: string): Category | undefined {
		return categoryStatements.getByName.get(name.trim()) as Category | undefined;
	},

	getOrCreate(name: string): number {
		const trimmed = name.trim();
		const existing = categoryStatements.getByName.get(trimmed) as Category | undefined;
		if (existing) return existing.id;

		try {
			const result = categoryStatements.insert.run(trimmed);
			return result.lastInsertRowid as number;
		} catch (error) {
			const after = categoryStatements.getByName.get(trimmed) as Category | undefined;
			if (after) return after.id;
			throw error;
		}
	},

	create(name: string): number {
		const result = categoryStatements.insert.run(name);
		return result.lastInsertRowid as number;
	},

	update(id: number, name: string): boolean {
		const result = categoryStatements.update.run(name, id);
		return result.changes > 0;
	},

	delete(id: number): boolean {
		const remove = db.transaction((categoryId: number) => {
			categoryStatements.clearCategoryFromTransactions.run(categoryId);
			const result = categoryStatements.delete.run(categoryId);
			return result.changes > 0;
		});

		return remove(id);
	}
};

// Handle graceful shutdown
process.on('exit', () => transactionDb.close());
process.on('SIGINT', () => {
	transactionDb.close();
	process.exit(0);
});
