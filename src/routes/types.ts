export interface Transaction {
	id?: number;
	ownAccountName: string;
	transactionDateTime: string;
	partnerName: string;
	amount: string;
	categoryId?: number | null;
}

export interface Category {
	id: number;
	name: string;
}
