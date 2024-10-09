CREATE TABLE IF NOT EXISTS companies (
    company_id    UUID  PRIMARY KEY,
    company_name  text  NOT NULL UNIQUE
);

CREATE TABLE company_contacts (
    company_id     UUID  NOT NULL,
    contact_name   text  NOT NULL,
    contact_title  text,
    contact_email  text,
    contact_phone  text,
    CONSTRAINT fk_company
      FOREIGN KEY (company_id) REFERENCES companies(company_id)
);