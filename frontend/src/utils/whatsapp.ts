const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '5592992781331';

/** Link para iniciar uma conversa direta (sem pedido), usado no header/rodapé. */
export const WHATSAPP_CONTACT_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/**
 * Abre a URL do WhatsApp (retornada pelo backend já com a mensagem do pedido).
 *
 * Usamos navegação na mesma aba (não window.open) de propósito: como isso
 * roda depois de um `await` na criação do pedido, o "gesto do usuário" do
 * clique já expirou aos olhos do navegador, e a maioria bloquearia um popup
 * aberto nesse momento — o que resultaria em nada acontecer. Em celulares
 * (o uso principal do sistema), o link wa.me abre o app do WhatsApp
 * diretamente, então a "aba" nem chega a importar de fato.
 */
export function openWhatsApp(url: string) {
  window.location.href = url;
}
