-- Step 1: Alter the column to set NOT NULL constraint
ALTER TABLE companies
ALTER COLUMN company_name SET NOT NULL;

-- Step 2: Add UNIQUE constraint to the column
ALTER TABLE companies
ADD CONSTRAINT unique_company_name UNIQUE (company_name);