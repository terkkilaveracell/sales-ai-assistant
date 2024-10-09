export const TypeMappings = {
  CompanyDomainName: "CompanyDomainName",
  // add more types here as needed
} as const;

export interface CompanyDomainName {
  company_domain_name: string;
}

export interface CompanyContact {
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  contact_title?: string;
}

export interface CompanyContacts {
  company_contacts: CompanyContact[];
}
