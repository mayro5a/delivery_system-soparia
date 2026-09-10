import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';

export async function list(_req: Request, res: Response) {
  const categories = await categoryService.listCategories();
  res.json({ success: true, data: categories });
}

export async function create(req: Request, res: Response) {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.json({ success: true, data: category });
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(req.params.id);
  res.json({ success: true, message: 'Categoria excluída com sucesso.' });
}
