import { getCustomRepository, getRepository, In } from 'typeorm';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface CsvTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

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

      const categoriesImported: string[] = [];
      const allCsvTransactions: CsvTransaction[] = [];

      parseCsv.on('data', async line => {
        const [title, type, value, category] = line;

        if (!title || !type || !value || !category) return;

        const transaction = {
          title,
          type,
          value,
          category,
        };

        categoriesImported.push(category);
        allCsvTransactions.push(transaction);
      });

      await new Promise(resolve => {
        parseCsv.on('end', resolve);
      });

      const categoriesRepository = getRepository(Category);
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );
      const existingCategories = await categoriesRepository.find({
        where: { title: In(categoriesImported) },
      });

      const existingCategoriesTitles = existingCategories.map(
        category => category.title,
      );

      const categoriesToAdd = categoriesImported
        .filter(category => {
          return !existingCategoriesTitles.includes(category);
        })
        .filter((value, index, self) => self.indexOf(value) === index);

      const newCategories = categoriesRepository.create(
        categoriesToAdd.map(title => ({
          title,
        })),
      );

      categoriesRepository.save(newCategories);

      const finalCategories = [...newCategories, ...existingCategories];
      const createdTransactions = transactionsRepository.create(
        allCsvTransactions.map(transaction => ({
          title: transaction.title,
          type: transaction.type,
          value: transaction.value,
          category: finalCategories.find(
            category => category.title === transaction.category,
          ),
        })),
      );

      await transactionsRepository.save(createdTransactions);
      await fs.promises.unlink(filePath);
      return createdTransactions;
    } catch (err) {
      throw new AppError('Imports not concluded.');
    }
  }
}

export default ImportTransactionsService;
