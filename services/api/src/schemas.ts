export const TypeMappings = {
  CompanyDomainName: "CompanyDomainName",
  // add more types here as needed
} as const;

export interface CompanyDomainName {
  company_domain_name: string;
}
