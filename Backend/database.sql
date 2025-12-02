-- 1. Bật Extension Vector (Bắt buộc cho RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tạo bảng DEPARTMENTS trước (Vì Users phụ thuộc vào nó)
CREATE TABLE public.departments (
    id SERIAL PRIMARY KEY, -- Đã sửa thành SERIAL để tự tăng
    name character varying NOT NULL UNIQUE,
    description text,
    allowed_document_types jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tạo bảng USERS (Vì các bảng khác phụ thuộc vào nó)
CREATE TABLE public.users (
    id BIGSERIAL PRIMARY KEY, -- Đã sửa thành BIGSERIAL
    email character varying NOT NULL,
    full_name character varying,
    role character varying DEFAULT 'EMPLOYEE'::character varying,
    avatar_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    department_id integer NOT NULL,
    CONSTRAINT fk_users_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

-- 4. Tạo bảng DOCUMENT_METADATA
CREATE TABLE public.document_metadata (
    id text NOT NULL, -- Giữ nguyên text theo ý bạn
    title text NOT NULL,
    url text,
    file_type text,
    file_size integer,
    created_at timestamp without time zone DEFAULT now(),
    schema text,
    user_id bigint,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT document_metadata_pkey PRIMARY KEY (id),
    CONSTRAINT document_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 5. Tạo bảng DOCUMENTS (Chứa Vector)
CREATE TABLE public.documents (
    id BIGSERIAL PRIMARY KEY,
    content text NOT NULL,
    metadata jsonb,
    -- QUAN TRỌNG: Sửa USER-DEFINED thành vector(1536) (Chuẩn OpenAI)
    -- Nếu bạn dùng model khác (ví dụ nomic-embed), hãy đổi 1536 thành 768
    embedding vector(1536), 
    created_at timestamp without time zone DEFAULT now(),
    user_id bigint,
    CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 6. Tạo bảng CHAT_HISTORY
CREATE TABLE public.chat_history (
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
CREATE TABLE public.document_rows (
    id SERIAL PRIMARY KEY,
    dataset_id text,
    row_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT document_rows_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.document_metadata(id)
);

-- 8. Tạo bảng DOCUMENTSFILE
CREATE TABLE public.documentsfile (
    id uuid NOT NULL, -- Code của bạn chắc chắn tự tạo UUID khi insert
    filename character varying NOT NULL,
    storage_path character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'UPLOADING'::character varying,
    classification character varying,
    gdpr_analysis text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone,
    filetype character varying,
    uploaded_by_email character varying,
    shared_department character varying DEFAULT 'NONE'::character varying,
    CONSTRAINT documentsfile_pkey PRIMARY KEY (id)
);