import { Request, Response } from 'express';
import * as regionService from '../services/deliveryRegion.service';

export async function listPublic(_req: Request, res: Response) {
  const regions = await regionService.listPublicDeliveryRegions();
  res.json({ success: true, data: regions });
}

export async function listAdmin(_req: Request, res: Response) {
  const regions = await regionService.listAdminDeliveryRegions();
  res.json({ success: true, data: regions });
}

export async function create(req: Request, res: Response) {
  const region = await regionService.createDeliveryRegion(req.body);
  res.status(201).json({ success: true, data: region });
}

export async function update(req: Request, res: Response) {
  const region = await regionService.updateDeliveryRegion(req.params.id, req.body);
  res.json({ success: true, data: region });
}

export async function remove(req: Request, res: Response) {
  await regionService.deleteDeliveryRegion(req.params.id);
  res.json({ success: true, message: 'Região excluída com sucesso.' });
}
