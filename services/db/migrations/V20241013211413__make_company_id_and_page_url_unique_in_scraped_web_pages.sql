ALTER TABLE 
    scraped_web_pages
ADD CONSTRAINT 
    unique_company_page_url
UNIQUE 
    (company_id, page_url)
;