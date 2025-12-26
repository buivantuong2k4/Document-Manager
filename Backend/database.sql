-- 1. Bật Extension Vector (Bắt buộc cho RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tạo bảng DEPARTMENTS trước (Vì Users phụ thuộc vào nó)
CREATE TABLE public.departments (
  id integer NOT NULL DEFAULT nextval('departments_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  description text,
  allowed_document_types jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

-- 3. Tạo bảng USERS (Vì các bảng khác phụ thuộc vào nó)
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL,
  full_name character varying,
  role character varying DEFAULT 'EMPLOYEE'::character varying,
  avatar_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  department_id integer NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT fk_users_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

-- 4. Tạo bảng DOCUMENT_METADATA
CREATE TABLE public.document_metadata (
  id text NOT NULL,
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
  id bigint NOT NULL DEFAULT nextval('documents_id_seq'::regclass),
  content text NOT NULL,
  metadata jsonb,
  embedding vector(1536),
  created_at timestamp without time zone DEFAULT now(),
  user_id bigint,
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 6. Tạo bảng CHAT_HISTORY
CREATE TABLE public.chat_history (
  id bigint NOT NULL DEFAULT nextval('chat_history_id_seq'::regclass),
  document_id text,
  user_message text NOT NULL,
  bot_response text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  user_id bigint,
  CONSTRAINT chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT chat_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id),
  CONSTRAINT chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 7. Tạo bảng DOCUMENT_ROWS
CREATE TABLE public.document_rows (
  id integer NOT NULL DEFAULT nextval('document_rows_id_seq'::regclass),
  dataset_id text,
  row_data jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT document_rows_pkey PRIMARY KEY (id),
  CONSTRAINT document_rows_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.document_metadata(id)
);

-- 8. Tạo bảng DOCUMENTSFILE
CREATE TABLE public.documentsfile (
  id uuid NOT NULL,
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

-- 9. Tạo bảng FILE_CONTRACT
CREATE TABLE public.file_contract (
  id integer NOT NULL DEFAULT nextval('file_contract_id_seq'::regclass),
  file_name character varying NOT NULL,
  minio_path character varying NOT NULL,
  owner_email character varying NOT NULL,
  size bigint,
  upload_date timestamp without time zone DEFAULT now(),
  status character varying DEFAULT 'pending'::character varying,
  sent_to_n8n boolean DEFAULT false,
  signer_name character varying NOT NULL,
  CONSTRAINT file_contract_pkey PRIMARY KEY (id)
);

-- 10. Tạo bảng FILE_CONTRACT_SIGNERS
CREATE TABLE public.file_contract_signers (
  id integer NOT NULL DEFAULT nextval('file_contract_signers_id_seq'::regclass),
  contract_id integer NOT NULL,
  signer_full_name character varying NOT NULL,
  signer_email character varying NOT NULL,
  CONSTRAINT file_contract_signers_pkey PRIMARY KEY (id),
  CONSTRAINT file_contract_signers_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.file_contract(id)
);

-- 11. Tạo bảng IMAGE_SIGN
CREATE TABLE public.image_sign (
  id integer NOT NULL DEFAULT nextval('image_sign_id_seq'::regclass),
  file_name character varying NOT NULL,
  full_name character varying NOT NULL,
  email character varying NOT NULL,
  mime_type character varying,
  url text NOT NULL,
  size integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT image_sign_pkey PRIMARY KEY (id)
);