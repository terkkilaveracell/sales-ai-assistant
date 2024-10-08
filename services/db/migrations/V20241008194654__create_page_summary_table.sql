CREATE TABLE page_summaries (
    page_id      UUID  PRIMARY KEY,
    page_url     text  NOT NULL,
    page_summary text
);