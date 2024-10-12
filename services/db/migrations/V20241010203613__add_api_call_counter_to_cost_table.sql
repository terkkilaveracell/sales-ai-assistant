ALTER TABLE 
    openai_api_daily_costs
ADD COLUMN 
    num_api_calls INTEGER CHECK (num_api_calls >= 0)
;