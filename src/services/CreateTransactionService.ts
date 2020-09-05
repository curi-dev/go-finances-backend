import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string; // Acho que não é isso
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    try {
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );

      const balance = await transactionsRepository.getBalance();

      if (type === 'outcome' && value > balance.total) {
        throw new AppError(
          'You cannot make this transaction. Balance is not enough.',
          400,
        );
      }
      const categoriesRepository = getRepository(Category);
      let transactionCategory;
      transactionCategory = await categoriesRepository.findOne({
        where: {
          title: category,
        },
      });

      if (!transactionCategory) {
        transactionCategory = categoriesRepository.create({
          title: category,
        });
      }

      await categoriesRepository.save(transactionCategory);

      const transaction = transactionsRepository.create({
        title,
        value,
        type,
        category_id: transactionCategory.id,
      });

      await transactionsRepository.save(transaction);

      return transaction;
    } catch (err) {
      throw new AppError('Database operation is not concluded.');
    }
  }
}

export default CreateTransactionService;
