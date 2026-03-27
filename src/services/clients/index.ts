export {
  getAllClients,
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStatistics,
  getClientPriceHistory,
} from './clients.service';

export type {
  ClientListItem,
  PriceHistoryItem,
  ClientDetail,
  ClientFiltersDto,
  PaginatedClientsDto,
  CreateClientDto,
  UpdateClientDto,
  ClientStatistics,
} from './clients.types';
