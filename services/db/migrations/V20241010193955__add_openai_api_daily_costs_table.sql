CREATE TABLE openai_api_daily_costs (
    day  date  PRIMARY KEY,
    cost numeric  CHECK (cost >= 0)
);