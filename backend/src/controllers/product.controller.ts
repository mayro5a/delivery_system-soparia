import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { AppError } from '../utils/AppError';

export async function listPublic(_req: Request, res: Response) {
  const products = await productService.listPublicProducts();
  res.json({ success: true, data: products });
}

export async function listAdmin(_req: Request, res: Response) {
  const products = await productService.listAdminProducts();
  res.json({ success: true, data: products });
}

export async function getOne(req: Request, res: Response) {
  const product = await productService.getProductById(req.params.id);
  res.json({ success: true, data: product });
}

export async function create(req: Request, res: Response) {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
}

export async function update(req: Request, res: Response) {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ success: true, data: product });
}

export async function remove(req: Request, res: Response) {
  await productService.deleteProduct(req.params.id);
  res.json({ success: true, message: 'Produto excluído com sucesso.' });
}

export async function updateAvailability(req: Request, res: Response) {
  const product = await productService.updateAvailability(req.params.id, req.body.available);
  res.json({ success: true, data: product });
}

/** Recebe a foto enviada pelo admin (multipart/form-data, campo "image") e devolve a URL pública. */
export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError('Nenhuma imagem foi enviada.', 400);
  }
  const url = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url } });
}
