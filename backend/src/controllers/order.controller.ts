import { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import * as paymentService from '../services/payment.service';

/** POST /api/orders — cria o pedido (AGUARDANDO_PAGAMENTO) e devolve o token de acompanhamento. */
export async function create(req: Request, res: Response) {
  const order = await orderService.createOrder(req.body);
  res.status(201).json({
    success: true,
    data: {
      order: orderService.toPublicOrder(order),
      accessToken: order.accessToken,
    },
  });
}

/** GET /api/orders/:id?token=... — acompanhamento do pedido pelo cliente. */
export async function getOneForCustomer(req: Request, res: Response) {
  const token = String(req.query.token ?? '');
  let order = await orderService.getOrderForCustomer(req.params.id, token);

  // Enquanto houver pagamento pendente, confirma o status real com o Mercado Pago.
  if (order.payments.some((p) => p.status === 'PENDING' && p.providerPaymentId)) {
    await paymentService.refreshPendingPaymentsForOrder(order.id);
    order = await orderService.getOrderForCustomer(req.params.id, token);
  }

  res.json({ success: true, data: orderService.toPublicOrder(order) });
}

// ---- Admin ----

export async function list(_req: Request, res: Response) {
  const orders = await orderService.listOrders();
  res.json({ success: true, data: orders });
}

export async function getOne(req: Request, res: Response) {
  const order = await orderService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
}

export async function updateStatus(req: Request, res: Response) {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
  res.json({ success: true, data: order });
}

export async function dashboard(_req: Request, res: Response) {
  const summary = await orderService.getDashboardSummary();
  res.json({ success: true, data: summary });
}
