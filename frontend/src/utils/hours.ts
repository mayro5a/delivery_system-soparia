/**
 * A Soparia funciona todos os dias das 18h às 23h. Em vez de decoração
 * genérica no topo do site, mostramos esse horário real: se está aberto
 * agora, e a que horas abre ou fecha.
 */
const OPEN_HOUR = 18;
const CLOSE_HOUR = 23;

export function getOpenStatus(now: Date = new Date()): { isOpen: boolean; label: string } {
  const hour = now.getHours();
  const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;
  return {
    isOpen,
    label: isOpen ? `Aberto agora · fecha às ${CLOSE_HOUR}h` : `Fechado agora · abre às ${OPEN_HOUR}h`,
  };
}
