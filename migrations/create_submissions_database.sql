-- Migration: Create submissions database tables
-- Description: Creates all tables needed in the separate submissions database
--              for storing user form submissions and step saves
-- Date: 2026-01-27
--
-- IMPORTANT: Run this migration on the 'hi_poc_submissions' database
-- Connection: postgresql://postgres:admin@localhost:5432/hi_poc_submissions
--
-- Before running this migration, create the database:
--   CREATE DATABASE hi_poc_submissions;

-- ===================================================
-- Table: form_step_saves
-- Stores partial form data for multi-step forms
-- Primary key (id) is used as the main identifier
-- ===================================================

CREATE TABLE IF NOT EXISTS form_step_saves (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255),
  data JSONB NOT NULL DEFAULT '{}',
  metadata_ip_address VARCHAR(255),
  metadata_user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for form_step_saves
CREATE INDEX IF NOT EXISTS idx_form_step_saves_updated_at ON form_step_saves(updated_at);

-- Add comments
COMMENT ON TABLE form_step_saves IS 'Stores all form data for a multi-step form in a single record, identified by primary key (id)';
COMMENT ON COLUMN form_step_saves.session_id IS 'Optional legacy session identifier (not used for lookups)';
COMMENT ON COLUMN form_step_saves.data IS 'JSONB object containing all form data from all steps, merged together';

-- ===================================================
-- Table: form_submissions
-- Stores completed form submissions
-- ===================================================

CREATE TABLE IF NOT EXISTS form_submissions (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  submitter_email VARCHAR(255),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata_ip_address VARCHAR(255),
  metadata_user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for form_submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitter_email ON form_submissions(submitter_email);

-- Add comments
COMMENT ON TABLE form_submissions IS 'Stores completed form submissions from users';
COMMENT ON COLUMN form_submissions.form_id IS 'Reference to the form ID in the admin database';
COMMENT ON COLUMN form_submissions.data IS 'JSONB object containing all submitted form data';
COMMENT ON COLUMN form_submissions.submitter_email IS 'Email of the submitter if available';

-- ===================================================
-- Verification
-- ===================================================

DO $$
BEGIN
  -- Verify form_step_saves table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_step_saves') THEN
    RAISE NOTICE 'Table form_step_saves created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create table form_step_saves';
  END IF;
  
  -- Verify form_submissions table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_submissions') THEN
    RAISE NOTICE 'Table form_submissions created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create table form_submissions';
  END IF;
  
  RAISE NOTICE '=== Submissions database setup completed successfully ===';
END $$;
