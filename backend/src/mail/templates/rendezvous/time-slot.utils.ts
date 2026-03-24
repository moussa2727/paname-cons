// Utilitaires partagés pour les templates de rendez-vous

export const formatTimeSlot = (timeSlot: string): string => {
  const timeMap: Record<string, string> = {
    SLOT_0900: '09:00',
    SLOT_0930: '09:30',
    SLOT_1000: '10:00',
    SLOT_1030: '10:30',
    SLOT_1100: '11:00',
    SLOT_1130: '11:30',
    SLOT_1400: '14:00',
    SLOT_1430: '14:30',
    SLOT_1500: '15:00',
    SLOT_1530: '15:30',
    SLOT_1600: '16:00',
    SLOT_1630: '16:30',
  };

  return timeMap[timeSlot] || timeSlot;
};

// Labels pour les statuts de rendez-vous
export const statusLabels: Record<string, string> = {
  PENDING: 'en attente',
  CONFIRMED: 'confirmé',
  COMPLETED: 'terminé',
  CANCELLED: 'annulé',
};

// Labels pour les annulations
export const cancelledByLabels: Record<string, string> = {
  USER: 'vous avez annulé',
  ADMIN: 'a été annulé par un administrateur',
};
