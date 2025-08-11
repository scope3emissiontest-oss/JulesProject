-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    extracted_data JSONB
);

-- Financial Statements Table
CREATE TABLE financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    extracted_data JSONB
);

-- Emission Factors Table
CREATE TABLE emission_factors (
    id SERIAL PRIMARY KEY,
    factor_id TEXT,
    scope TEXT,
    level_1 TEXT,
    level_2 TEXT,
    level_3 TEXT,
    level_4 TEXT,
    uom TEXT,
    ghg_unit TEXT,
    conversion_factor FLOAT
);

-- Emission Calculations Table
CREATE TABLE emission_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    financial_statement_id UUID REFERENCES financial_statements(id),
    user_id UUID REFERENCES auth.users(id),
    emission_factor_id INTEGER REFERENCES emission_factors(id),
    activity_data FLOAT,
    co2e_emissions FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
