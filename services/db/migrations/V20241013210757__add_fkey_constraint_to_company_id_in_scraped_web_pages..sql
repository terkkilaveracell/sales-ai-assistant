ALTER TABLE 
    scraped_web_pages
ADD CONSTRAINT 
    fk_company
FOREIGN KEY 
    (company_id) 
REFERENCES 
    companies(company_id)
;