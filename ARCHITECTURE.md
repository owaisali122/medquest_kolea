# MedQuest Kolea - Architecture Overview

## Table of Contents
1. [Database Architecture](#database-architecture)
2. [Data Layer](#data-layer)
3. [API Routes](#api-routes)
4. [Stepper Form Flow](#stepper-form-flow)
5. [State Management](#state-management)

---

## Database Architecture

The application uses **two separate PostgreSQL databases**:

### 1. Admin Database (`hi_poc_fresh`)
- **Purpose**: Stores form definitions/schemas created by administrators
- **Tables**: `forms` (form schemas, settings, metadata)
- **Used for**: Reading form configurations (read-only from frontend perspective)

### 2. Submissions Database (`hi_poc_submissions`)
- **Purpose**: Stores user-submitted form data
- **Tables**: 
  - `form_step_saves` - Partial/in-progress form data
  - `form_submissions` - Completed form submissions

### Connection Setup (`lib/db/index.ts`)

```typescript
import postgres from 'postgres'

// Admin DB - for reading form definitions
export const adminDb = postgres(process.env.ADMIN_DATABASE_URL)

// Submissions DB - for storing user data
export const submissionsDb = postgres(process.env.SUBMISSIONS_DATABASE_URL)

export function getDb(type: 'admin' | 'submissions') {
  return type === 'admin' ? adminDb : submissionsDb
}
```

### Database Schema

#### `form_step_saves` (Submissions DB)
```sql
CREATE TABLE form_step_saves (
  id SERIAL PRIMARY KEY,              -- Main identifier (used in URL)
  session_id VARCHAR(255),            -- Optional (legacy, not used)
  data JSONB NOT NULL DEFAULT '{}',   -- All form data + metadata
  metadata_ip_address VARCHAR(255),
  metadata_user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

The `data` JSONB column stores:
```json
{
  "step0_form5_firstName": "John",
  "step0_form5_lastName": "Doe",
  "step1_form6_email": "john@example.com",
  "_metadata": {
    "currentFormId": 5,
    "currentStepIndex": 1,
    "lastUpdated": "2026-01-28T10:00:00Z"
  }
}
```

---

## Data Layer

The data layer (`lib/dataLayer/index.ts`) provides a centralized abstraction for all database operations.

### Usage Pattern

```typescript
import { dataLayer } from '@/lib/dataLayer'

// Read
const result = await dataLayer('submissions', 'form_step_saves', 'read', {
  columns: ['id', 'data'],
  where: [{ column: 'id', operator: '=', value: 123 }],
  limit: 1,
})

// Create
const result = await dataLayer('submissions', 'form_step_saves', 'create', {
  data: { data: formData, created_at: new Date() },
  returning: ['id'],
})

// Update
const result = await dataLayer('submissions', 'form_step_saves', 'update', {
  data: { data: mergedData, updated_at: new Date() },
  where: [{ column: 'id', operator: '=', value: 123 }],
  returning: ['id'],
})
```

### Supported Operations
- `create` - INSERT new record
- `read` - SELECT with filters, ordering, pagination
- `update` - UPDATE with WHERE conditions
- `delete` - DELETE with WHERE conditions
- `upsert` - INSERT ON CONFLICT UPDATE

---

## API Routes

### 1. Save Step Data
**`POST /api/forms/save-step`**

Saves form data when user clicks Next, Previous, or Save & Exit.

**Request:**
```json
{
  "formId": 5,
  "stepIndex": 0,
  "data": { "firstName": "John", "lastName": "Doe" },
  "recordId": null  // null for new, number for existing
}
```

**Response:**
```json
{
  "success": true,
  "recordId": 123,
  "message": "Form data saved successfully",
  "isUpdate": false
}
```

**Logic:**
- If `recordId` provided → Update existing record (merge data)
- If no `recordId` → Create new record, return new ID

### 2. Get Session State
**`GET /api/forms/get-session-state?recordId=123`**

Retrieves saved form data when page loads or refreshes.

**Response:**
```json
{
  "hasSavedState": true,
  "recordId": 123,
  "currentForm": 5,
  "currentPage": 1,
  "data": {
    "step0_form5_firstName": "John",
    "step0_form5_lastName": "Doe"
  },
  "metadata": {
    "currentFormId": 5,
    "currentStepIndex": 1
  }
}
```

### 3. Get Pending Forms
**`GET /api/forms/pending`**

Returns all incomplete forms for the pending forms list.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "forms": [
    {
      "id": 123,
      "formId": 5,
      "formTitle": "Personal Information",
      "currentStep": 1,
      "lastUpdated": "2026-01-28T10:00:00Z",
      "hasData": true
    }
  ]
}
```

### 4. Submit Form
**`POST /api/forms/submit`**

Final submission of completed form.

**Request:**
```json
{
  "formId": 5,
  "data": { /* all form fields */ }
}
```

---

## Stepper Form Flow

The application provides **two stepper form variants** with identical data persistence logic but different UI styles:

### Components

| Component | File | UI Style | URL |
|-----------|------|----------|-----|
| `SimpleStepperForm` | `app/components/stepper/SimpleStepperForm.tsx` | Sidebar navigation | `/forms/simple-stepper` |
| `TabStepperForm` | `app/components/stepper/TabStepperForm.tsx` | Tab-based navigation | `/forms/stepper` |

Both components share the same:
- Redux state management
- API endpoints (`/api/forms/save-step`, `/api/forms/get-session-state`)
- Data persistence logic
- URL parameter structure

### URL Structure
```
# SimpleStepperForm (sidebar style)
/forms/simple-stepper              → New form (fresh start)
/forms/simple-stepper?id=123       → Continue existing form
/forms/simple-stepper?id=123&step=2 → Continue at specific step

# TabStepperForm (tab style)
/forms/stepper                     → List page (all forms)
/forms/stepper/new                 → New form (fresh start)
/forms/stepper/123                 → Edit existing form (record ID 123)
/forms/stepper/123?step=2          → Continue at specific step
```

### Pending Forms Lists
```
/forms/pending                → Pending forms for SimpleStepperForm
/forms/stepper                → List page for TabStepperForm (includes pending)
```

### Initialization Flow

```
1. Page Load
   ↓
2. Check URL for ?id parameter
   ↓
3. If no ID → Fresh form, step 0, empty data
   If ID exists → Fetch from /api/forms/get-session-state?recordId=ID
   ↓
4. Load data into Redux store
   ↓
5. Render current step's form with pre-filled data
```

### Save Flow (Next Button)

```
1. User clicks "Next"
   ↓
2. Extract form data from DOM (FormIO fields)
   ↓
3. Add step prefix to field names (e.g., step0_form5_fieldName)
   ↓
4. Merge with existing Redux data
   ↓
5. POST to /api/forms/save-step
   ↓
6. If new record → Get recordId from response
   ↓
7. Update URL to ?id=123&step=1
   ↓
8. Navigate to next step
```

### Data Prefixing Strategy

Each step's form fields are prefixed to avoid collisions:
```
Pattern: step{stepIndex}_form{formId}_{fieldName}

Examples:
- step0_form5_firstName
- step0_form5_lastName  
- step1_form6_email
- step1_form6_phone
```

This allows all steps' data to be stored in a single JSONB object.

---

## State Management

### Redux Store (`lib/store/stepperSlice.ts`)

```typescript
interface StepperState {
  currentStep: number      // Current step index (0-based)
  formData: Record<string, any>  // All form data (prefixed)
  recordId: number | null  // Database record ID
  isLoading: boolean       // Loading state
  isSaving: boolean        // Saving state
  hasUnsavedChanges: boolean
}
```

### Actions
- `setCurrentStep(step)` - Navigate to step
- `setFormData(data)` - Replace all form data
- `updateFormData(data)` - Merge new data
- `setRecordId(id)` - Set database record ID
- `setLoading(bool)` - Toggle loading state
- `setSaving(bool)` - Toggle saving state
- `markSaved()` - Clear unsaved changes flag

---

## File Structure

```
lib/
├── db/
│   └── index.ts          # Database connections (adminDb, submissionsDb)
├── dataLayer/
│   ├── index.ts          # CRUD operations abstraction
│   └── types.ts          # TypeScript interfaces
├── forms.ts              # Form fetching utilities (uses adminDb)
└── store/
    ├── index.ts          # Redux store setup
    └── stepperSlice.ts   # Stepper state management

app/
├── api/forms/
│   ├── save-step/route.ts       # Save partial form data
│   ├── get-session-state/route.ts # Load saved form data
│   ├── pending/route.ts         # List all pending forms
│   └── submit/route.ts          # Final form submission
├── components/
│   └── stepper/
│       ├── SimpleStepperForm.tsx # Sidebar-style stepper component
│       ├── TabStepperForm.tsx    # Tab-style stepper component
│       └── StepperForm.tsx       # Legacy stepper (deprecated)
└── forms/
    ├── simple-stepper/
    │   └── page.tsx              # SimpleStepperForm page
    ├── stepper/
    │   ├── page.tsx              # TabStepperForm list page
    │   ├── new/
    │   │   └── page.tsx          # New form page
    │   └── [id]/
    │       ├── page.tsx          # Edit form page (dynamic route)
    │       └── TabStepperFormWrapper.tsx # Client wrapper
    └── pending/
        └── page.tsx              # Pending forms for SimpleStepperForm

migrations/
└── create_submissions_database.sql # Submissions DB schema
```

---

## Key Design Decisions

1. **Two Databases**: Separates form definitions (admin) from user data (submissions) for security and scalability.

2. **Record ID in URL**: Enables page refresh without data loss, shareable links, and no dependency on cookies/sessions.

3. **Single JSONB Record**: All step data stored in one record, merged on each save. Simplifies queries and reduces table complexity.

4. **Field Prefixing**: Prevents field name collisions between steps that might have same field names.

5. **No Session Cookies**: Stateless design - all state is in URL parameters and database.
