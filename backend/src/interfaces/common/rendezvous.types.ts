// =================================
// TYPES RENDEZVOUS (Gestion des rendez-vous)
// =================================

export interface RendezvousJobData {
  data: {
    rendezvousId: string;
    email: string;
    firstName: string;
    lastName: string;
    telephone?: string;
    destination?: string;
    date: string;
    time: string;
    filiere?: string;
  };
}

export interface RendezvousQueryDto {
  status?: string;
  date?: string;
  email?: string;
  destination?: string;
  filiere?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  hasAvis?: boolean;
  hasProcedure?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedRendezvousResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
