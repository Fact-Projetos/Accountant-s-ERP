export interface Client {
  id: string;
  // Basic Info
  status: 'Ativo' | 'Inativo' | 'Com Manutenção' | 'Sem Manutenção';
  code?: string;
  cnpj: string;
  name: string; // Razão Social
  tradeName?: string; // Nome Fantasia

  // Address
  zipCode?: string; // CEP
  street?: string; // Logradouro
  number?: string;
  complement?: string;
  neighborhood?: string; // Bairro
  city?: string;
  state?: string; // UF

  // Fiscal Info
  stateRegistration?: string; // Inscrição Estadual
  municipalRegistration?: string; // Inscrição Municipal
  nire?: string;
  taxRegime?: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
  lastNfe?: string;

  // Contact
  phone?: string;
  email: string;

  // Access Credentials
  cityHallLogin?: string;
  cityHallPassword?: string;
  userLogin?: string;
  userPassword?: string; // Senha Usuário

  // Certificate
  certificateFile?: string | File;
  certificatePassword?: string;

  // Client Date
  clientDate?: string; // Data de entrada do cliente

  // Simples Nacional Access
  simplesNacionalCnpj?: string;
  simplesNacionalCpf?: string;
  simplesNacionalAccess?: string; // Código de acesso

  // Legacy/System fields
  lastAccess?: string;
  // Permissions
  visibleViews?: ViewState[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: string;
}

export interface Partner {
  id: string;
  type: 'cliente' | 'fornecedor';
  name: string; // Razão Social / Nome
  document: string; // CNPJ / CPF
  email?: string;
  phone?: string;
  contactName?: string;
  stateRegistration?: string; // Inscrição Estadual

  // Address
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  status: 'Ativo' | 'Inativo';
}

export interface User {
  name: string;
  role: 'Contador' | 'Cliente';
}

export interface CityLink {
  id: string;
  city: string;
  url: string;
}

export enum ViewState {
  // Accountant Views
  HOME = 'HOME',
  CLIENTS = 'CLIENTS',
  MOVEMENTS = 'MOVEMENTS',
  TAX_ASSESSMENT = 'TAX_ASSESSMENT',
  LINKS_NFSE = 'LINKS_NFSE',
  ACC_FINANCIAL = 'ACC_FINANCIAL',
  SETTINGS = 'SETTINGS',

  // Client Views
  MY_COMPANY = 'MY_COMPANY',
  SALES = 'SALES',
  SERVICES = 'SERVICES',
  INVENTORY = 'INVENTORY',
  PARTNERS = 'PARTNERS', // Renamed from SALES_CLIENTS
  IMPORT_NFE = 'IMPORT_NFE',
  NFE_ACTIONS = 'NFE_ACTIONS',
  FISCAL_MATRIX = 'FISCAL_MATRIX',
  FINANCIAL = 'FINANCIAL',
  DOCUMENTS = 'DOCUMENTS'
}