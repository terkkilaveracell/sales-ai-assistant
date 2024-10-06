CREATE TABLE companies (
    company_id UUID PRIMARY KEY,
    company_name TEXT NOT NULL,
    company_details JSON
);