import { getCustomRepository, getRepository } from 'typeorm';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import CreateTransactionService from './CreateTransactionService';
import AppError from '../errors/AppError';

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    try {
      const csvFilePath = path.resolve(filePath);

      const readCsvStream = fs.createReadStream(csvFilePath);
      const parseStream = csvParse({
        fromLine: 2,
        ltrim: true,
        rtrim: true,
      });

      const parseCsv = readCsvStream.pipe(parseStream);

      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );
      const categoriesRepository = getRepository(Category);

      const allTransactions: Transaction[] = [];
      parseCsv.on('data', async line => {
        const [title, type, value, category] = line;

        if (!title || !type || !value || !category) {
          return;
        }

        let transactionCategory;
        transactionCategory = await categoriesRepository.findOne({
          where: { title: category },
        });

        if (!transactionCategory) {
          transactionCategory = categoriesRepository.create({
            title: category,
          });

          await categoriesRepository.save(transactionCategory);
        }

        const transaction = transactionsRepository.create({
          title,
          type,
          value,
          category: transactionCategory,
        });

        allTransactions.push(transaction);

        await transactionsRepository.save(transaction);
      });

      await new Promise(resolve => {
        parseCsv.on('end', resolve);
      });

      return allTransactions;
    } catch (err) {
      throw new AppError('Imports not concluded.');
    }
  }
}

export default ImportTransactionsService;
