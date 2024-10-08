ALTER TABLE
    page_summaries
ADD CONSTRAINT
    unique_page_url UNIQUE (page_url)
;