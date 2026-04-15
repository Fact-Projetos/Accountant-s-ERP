-- Rode este script no Editor SQL (SQL Editor) do seu Supabase

BEGIN;

DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY['accountant_financial', 'financial_extra_services'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Remove constraints antigas
        BEGIN EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_company_id_fkey', t, t); EXCEPTION WHEN others THEN null; END;
        
        -- Verifica se a company_id atual é string
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='company_id' AND data_type IN ('character varying', 'uuid', 'text')) THEN
            EXECUTE format('ALTER TABLE public.%I DROP COLUMN company_id CASCADE', t);
        END IF;

        -- Mesma lógica do seu outro arquivo, veja se sobrou a new_company_id para renomear
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='new_company_id') THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN new_company_id TO company_id', t);
        ELSE
            -- Se não havia new_company_id e dropamos, cria a nova em formato inteiro
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='company_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id int4', t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Adicionar as novas referências usando int4 
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY['accountant_financial', 'financial_extra_services'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        BEGIN 
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE', t, t); 
        EXCEPTION WHEN duplicate_object THEN 
            null; 
        END;
    END LOOP;
END $$;

COMMIT;
