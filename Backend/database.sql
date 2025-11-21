-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_history (
  id bigint NOT NULL DEFAULT nextval('chat_history_id_seq'::regclass),
  document_id text,
  user_message text NOT NULL,
  bot_response text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT chat_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id)
);
CREATE TABLE public.document_metadata (
  id text NOT NULL,
  title text NOT NULL,
  url text,
  file_type text,
  file_size integer,
  created_at timestamp without time zone DEFAULT now(),
  schema text,
  CONSTRAINT document_metadata_pkey PRIMARY KEY (id)
);
CREATE TABLE public.document_rows (
  id integer NOT NULL DEFAULT nextval('document_rows_id_seq'::regclass),
  dataset_id text,
  row_data jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT document_rows_pkey PRIMARY KEY (id),
  CONSTRAINT document_rows_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.document_metadata(id)
);
CREATE TABLE public.documents (
  id bigint NOT NULL DEFAULT nextval('documents_id_seq'::regclass),
  content text NOT NULL,
  metadata jsonb,
  embedding USER-DEFINED,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
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
CREATE TABLE public.users (
  email character varying NOT NULL,
  full_name character varying,
  role character varying DEFAULT 'EMPLOYEE'::character varying,
  department character varying,
  avatar_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (email)
);