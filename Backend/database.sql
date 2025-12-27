-- 1. Bật Extension Vector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tạo bảng DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
    id SERIAL PRIMARY KEY,
    name character varying NOT NULL UNIQUE,
    description text,
    allowed_document_types jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tạo bảng USERS
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    email character varying NOT NULL UNIQUE,
    full_name character varying,
    role character varying DEFAULT 'EMPLOYEE',
    avatar_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    department_id integer NOT NULL,
    CONSTRAINT fk_users_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

-- 4. Tạo bảng DOCUMENT_METADATA
CREATE TABLE IF NOT EXISTS public.document_metadata (
    id text PRIMARY KEY,
    title text NOT NULL,
    url text,
    file_type text,
    file_size integer,
    created_at timestamp without time zone DEFAULT now(),
    schema text,
    user_id bigint,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT document_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 5. Tạo bảng DOCUMENTS (Vector Store)
CREATE TABLE IF NOT EXISTS public.documents (
    id BIGSERIAL PRIMARY KEY,
    content text NOT NULL,
    metadata jsonb,
    embedding vector(1536),
    created_at timestamp without time zone DEFAULT now(),
    user_id bigint,
    CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 6. Tạo bảng CHAT_HISTORY
CREATE TABLE IF NOT EXISTS public.chat_history (
    id BIGSERIAL PRIMARY KEY,
    document_id text,
    user_message text NOT NULL,
    bot_response text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    user_id bigint,
    CONSTRAINT chat_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id),
    CONSTRAINT chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 7. Tạo bảng DOCUMENT_ROWS
CREATE TABLE IF NOT EXISTS public.document_rows (
    id SERIAL PRIMARY KEY,
    dataset_id text,
    row_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT document_rows_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.document_metadata(id)
);

-- 8. Tạo bảng DOCUMENTSFILE
CREATE TABLE IF NOT EXISTS public.documentsfile (
    id uuid PRIMARY KEY,
    filename character varying NOT NULL,
    storage_path character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'UPLOADING',
    classification character varying,
    gdpr_analysis text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone,
    filetype character varying,
    uploaded_by_email character varying,
    shared_department character varying DEFAULT 'NONE'
);

-- 9. Tạo bảng FILE_CONTRACT
CREATE TABLE IF NOT EXISTS public.file_contract (
    id SERIAL PRIMARY KEY,
    file_name character varying NOT NULL,
    minio_path character varying NOT NULL,
    owner_email character varying NOT NULL,
    size bigint,
    upload_date timestamp without time zone DEFAULT now(),
    status character varying DEFAULT 'pending',
    sent_to_n8n boolean DEFAULT false,
    signer_name character varying NOT NULL
);

-- 10. Tạo bảng FILE_CONTRACT_SIGNERS
CREATE TABLE IF NOT EXISTS public.file_contract_signers (
    id SERIAL PRIMARY KEY,
    contract_id integer NOT NULL,
    signer_full_name character varying NOT NULL,
    signer_email character varying NOT NULL,
    CONSTRAINT file_contract_signers_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.file_contract(id)
);

-- 11. Tạo bảng IMAGE_SIGN
CREATE TABLE IF NOT EXISTS public.image_sign (
    id SERIAL PRIMARY KEY,
    file_name character varying NOT NULL,
    full_name character varying NOT NULL,
    email character varying NOT NULL,
    mime_type character varying,
    url text NOT NULL,
    size integer,
    created_at timestamp without time zone DEFAULT now()
);