import { getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';

import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    try {
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );
      const transactionExists = await transactionsRepository.findOne(id);

      if (!transactionExists) {
        throw new AppError('Transaction does not exist.');
      }

      await transactionsRepository.remove(transactionExists);
    } catch (error) {
      throw new AppError('Database operation is not concluded.');
    }
  }
}

export default DeleteTransactionService;
