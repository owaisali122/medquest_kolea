# Next.js Project Standards and Best Practices

> **Version:** 1.0  
> **Last Updated:** 2024  
> **Framework:** Next.js 16+ (App Router)

This document defines project-standard approaches and best practices for building production-grade Next.js applications. All team members should follow these guidelines to ensure consistency, maintainability, and scalability.

---

## Table of Contents

1. [Project Structure and Folder Organization](#project-structure-and-folder-organization)
2. [Architectural Patterns](#architectural-patterns)
3. [Routing (App Router)](#routing-app-router)
4. [State Management](#state-management)
5. [Data Fetching Strategies](#data-fetching-strategies)
6. [Performance Optimization](#performance-optimization)
7. [SEO and Metadata](#seo-and-metadata)
8. [Security Best Practices](#security-best-practices)
9. [Environment Configuration](#environment-configuration)
10. [Styling and Design Systems](#styling-and-design-systems)
11. [Error Handling and Logging](#error-handling-and-logging)
12. [Testing Strategies](#testing-strategies)
13. [CI/CD and Deployment](#cicd-and-deployment)
14. [Code Quality, Linting, and Formatting](#code-quality-linting-and-formatting)
15. [Scalability and Maintainability](#scalability-and-maintainability)

---

## Project Structure and Folder Organization

### Directory Structure

```
project-root/
├── app/                          # App Router directory
│   ├── (auth)/                   # Route groups (not in URL)
│   ├── (marketing)/              # Route groups for organization
│   ├── api/                      # API routes
│   │   └── [resource]/
│   │       └── route.ts          # Route handlers
│   ├── components/               # Shared React components
│   │   ├── ui/                   # Reusable UI components
│   │   ├── layout/               # Layout components
│   │   └── providers/            # Context providers
│   ├── lib/                      # Utility functions and helpers
│   │   ├── db/                   # Database utilities
│   │   ├── utils/                # General utilities
│   │   └── constants/            # Constants and configs
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript type definitions
│   ├── styles/                   # Global styles
│   ├── globals.css               # Global CSS
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root page
├── public/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── migrations/                   # Database migrations
├── scripts/                      # Build and utility scripts
├── tests/                        # Test files
│   ├── __mocks__/
│   ├── unit/
│   └── integration/
├── .env.local                    # Local environment variables
├── .env.example                  # Example environment file
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── package.json                  # Dependencies and scripts
```

### Naming Conventions

#### Files and Directories
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities/Hooks**: camelCase (e.g., `useAuth.ts`, `formatDate.ts`)
- **API Routes**: kebab-case (e.g., `user-profile/route.ts`)
- **Pages**: lowercase with hyphens (e.g., `user-settings/page.tsx`)
- **Types/Interfaces**: PascalCase (e.g., `UserProfile.ts`)

#### Code Naming
- **Components**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase (prefix interfaces with `I` only if team convention)
- **Enums**: PascalCase

### File Organization Rules

1. **One component per file** - Each component should have its own file
2. **Co-location** - Keep related files close together (e.g., component + tests + styles)
3. **Barrel exports** - Use `index.ts` files for clean imports
4. **Separation of concerns** - Separate business logic from presentation
5. **Feature-based organization** - Group related functionality together

### Import Organization

```typescript
// 1. React and Next.js imports
import { useState, useEffect } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import Link from 'next/link';

// 2. Third-party libraries
import { z } from 'zod';
import { format } from 'date-fns';

// 3. Internal modules (absolute imports with @ alias)
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/db';

// 4. Relative imports
import './Component.module.css';
import { helperFunction } from './utils';

// 5. Type-only imports (use `type` keyword)
import type { User } from '@/types/user';
```

---

## Architectural Patterns

### Component Architecture

#### Component Hierarchy
```
Page Component (Server/Client)
  └── Layout Components
      └── Feature Components
          └── UI Components
              └── Primitive Components
```

#### Component Types

1. **Page Components** (`app/**/page.tsx`)
   - Server Components by default
   - Handle routing and data fetching
   - Minimal UI logic

2. **Layout Components** (`app/**/layout.tsx`)
   - Define page structure
   - Shared UI across routes
   - Can be nested

3. **Feature Components** (`components/features/`)
   - Business logic components
   - Domain-specific functionality
   - May use client-side features

4. **UI Components** (`components/ui/`)
   - Reusable, presentational components
   - No business logic
   - Highly composable

5. **Primitive Components** (`components/primitives/`)
   - Basic building blocks (Button, Input, etc.)
   - Styled system components
   - Maximum reusability

### Server vs Client Components

#### Default: Server Components
- Use Server Components by default
- No JavaScript sent to client
- Direct database/API access
- Better performance and SEO

```typescript
// app/users/page.tsx (Server Component)
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.users.findMany();
  
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

#### When to Use Client Components
- Interactivity (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- State management (useState, useEffect, etc.)
- Event listeners
- Third-party libraries requiring client-side

```typescript
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### Data Flow Patterns

1. **Server-to-Client Data Flow**
   - Server Components fetch data
   - Pass as props to Client Components
   - Use serializable data only

2. **Client-to-Server Communication**
   - Use Server Actions for mutations
   - Use API Routes for external integrations
   - Validate all inputs

3. **State Management**
   - Local state: `useState`, `useReducer`
   - Server state: React Server Components
   - Global state: Context API or state management library
   - URL state: `useSearchParams`, `useRouter`

### Separation of Concerns

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (Components, Pages, Layouts)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Business Logic Layer        │
│  (Hooks, Services, Utilities)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Data Access Layer          │
│  (API Routes, Database, External)    │
└─────────────────────────────────────┘
```

---

## Routing (App Router)

### File-Based Routing

Next.js App Router uses file-based routing with special files:

- `page.tsx` - Route segment (creates a page)
- `layout.tsx` - Shared UI for a segment
- `loading.tsx` - Loading UI
- `error.tsx` - Error UI
- `not-found.tsx` - 404 page
- `route.ts` - API route handler
- `template.tsx` - Re-rendered layout variant

### Route Organization

#### Route Groups
Use parentheses `()` to organize routes without affecting URL structure:

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/
│   ├── dashboard/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
└── layout.tsx
```

#### Dynamic Routes
Use brackets `[]` for dynamic segments:

```
app/
├── blog/
│   ├── [slug]/
│   │   └── page.tsx
│   └── [category]/
│       └── [slug]/
│           └── page.tsx
```

```typescript
// app/blog/[slug]/page.tsx
interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BlogPost({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  
  // Fetch data based on slug
  const post = await getPost(slug);
  
  return <article>{post.content}</article>;
}
```

#### Catch-All Routes
Use `[...slug]` for catch-all segments:

```
app/
└── docs/
    └── [...slug]/
        └── page.tsx
```

#### Optional Catch-All Routes
Use `[[...slug]]` for optional catch-all:

```
app/
└── shop/
    └── [[...slug]]/
        └── page.tsx
```

### Route Handlers (API Routes)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### Route Segment Config

```typescript
// app/dashboard/page.tsx
export const dynamic = 'force-dynamic'; // or 'force-static', 'auto'
export const revalidate = 3600; // ISR revalidation time
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; // or 'edge'
export const preferredRegion = 'us-east-1';

export default function DashboardPage() {
  // ...
}
```

### Navigation

```typescript
// Client-side navigation
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  
  return (
    <nav>
      <Link href="/dashboard" prefetch={true}>
        Dashboard
      </Link>
      <button onClick={() => router.push('/settings')}>
        Go to Settings
      </button>
    </nav>
  );
}
```

### Middleware

```typescript
// middleware.ts (root level)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Authentication check
  const token = request.cookies.get('auth-token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## State Management

### State Management Strategy

Choose the appropriate state management solution based on use case:

1. **Local Component State** - `useState`, `useReducer`
2. **Server State** - React Server Components, Server Actions
3. **URL State** - `useSearchParams`, query parameters
4. **Global Client State** - Context API, Zustand, Redux Toolkit
5. **Form State** - React Hook Form, Formik
6. **Cache State** - React Query, SWR

### Local State (useState, useReducer)

```typescript
'use client';

import { useState, useReducer } from 'react';

// Simple state
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Complex state with reducer
interface State {
  count: number;
  step: number;
}

type Action = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'setStep':
      return { ...state, step: action.payload };
    default:
      return state;
  }
}

function AdvancedCounter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });
  
  return (
    <div>
      <button onClick={() => dispatch({ type: 'increment' })}>
        +{state.step}
      </button>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'decrement' })}>
        -{state.step}
      </button>
    </div>
  );
}
```

### Context API

```typescript
// lib/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const login = async (email: string, password: string) => {
    // Login logic
    const userData = await authenticate(email, password);
    setUser(userData);
  };
  
  const logout = () => {
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Redux Toolkit (When Needed)

```typescript
// lib/store/slices/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
```

### Server Actions

```typescript
// app/actions/user.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  
  // Validate input
  if (!name || !email) {
    return { error: 'Name and email are required' };
  }
  
  // Create user
  const user = await db.users.create({ data: { name, email } });
  
  // Revalidate cache
  revalidatePath('/users');
  
  return { success: true, user };
}

// Usage in component
'use client';

import { createUser } from '@/app/actions/user';

export function UserForm() {
  async function handleSubmit(formData: FormData) {
    const result = await createUser(formData);
    if (result.error) {
      // Handle error
    }
  }
  
  return (
    <form action={handleSubmit}>
      <input name="name" />
      <input name="email" type="email" />
      <button type="submit">Create User</button>
    </form>
  );
}
```

### URL State Management

```typescript
'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export function FilterComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const category = searchParams.get('category') || 'all';
  
  function updateCategory(newCategory: string) {
    const params = new URLSearchParams(searchParams);
    params.set('category', newCategory);
    router.push(`/products?${params.toString()}`);
  }
  
  return (
    <select value={category} onChange={(e) => updateCategory(e.target.value)}>
      <option value="all">All</option>
      <option value="electronics">Electronics</option>
    </select>
  );
}
```

---

## Data Fetching Strategies

### Server Components (Recommended)

```typescript
// app/users/page.tsx
import { db } from '@/lib/db';

// This runs on the server
export default async function UsersPage() {
  const users = await db.users.findMany();
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Fetch API with Caching

```typescript
// Default: cached, revalidated
const response = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // Revalidate every hour
});

// Force dynamic
const response = await fetch('https://api.example.com/data', {
  cache: 'no-store'
});

// Revalidate on-demand
const response = await fetch('https://api.example.com/data', {
  next: { tags: ['users'] }
});

// Then revalidate:
import { revalidateTag } from 'next/cache';
revalidateTag('users');
```

### Parallel Data Fetching

```typescript
export default async function DashboardPage() {
  // Fetch in parallel
  const [users, posts, stats] = await Promise.all([
    getUsers(),
    getPosts(),
    getStats(),
  ]);
  
  return (
    <div>
      <UsersList users={users} />
      <PostsList posts={posts} />
      <StatsDisplay stats={stats} />
    </div>
  );
}
```

### Sequential Data Fetching

```typescript
export default async function UserPage({ params }: { params: { id: string } }) {
  // Fetch sequentially when dependencies exist
  const user = await getUser(params.id);
  const posts = await getUserPosts(user.id);
  
  return (
    <div>
      <UserProfile user={user} />
      <UserPosts posts={posts} />
    </div>
  );
}
```

### Streaming and Suspense

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { UsersList, UsersListSkeleton } from '@/components/users';

export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<UsersListSkeleton />}>
        <UsersList />
      </Suspense>
    </div>
  );
}

// components/users/UsersList.tsx
export async function UsersList() {
  const users = await getUsers(); // This can be slow
  
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Client-Side Data Fetching

```typescript
'use client';

import { useEffect, useState } from 'react';

export function ClientDataFetch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* Render data */}</div>;
}
```

### React Query / SWR (For Complex Client State)

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function UsersList() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });
  
  const mutation = useMutation({
    mutationFn: (newUser: User) => 
      fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;
  
  return (
    <div>
      {data.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

---

## Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image';

export function OptimizedImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={800}
      height={600}
      priority // Load immediately
      placeholder="blur" // Show blur while loading
      blurDataURL="data:image/..." // Base64 blur placeholder
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

### Code Splitting and Dynamic Imports

```typescript
// Dynamic import for heavy components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Disable SSR if needed
});

export default function Page() {
  return <HeavyComponent />;
}
```

### Bundle Analysis

```bash
# Analyze bundle size
npm install @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

### Caching Strategies

```typescript
// Static Generation (SSG)
export const revalidate = 3600; // Revalidate every hour

// Incremental Static Regeneration (ISR)
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// On-demand Revalidation
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { slug } = await request.json();
  await updatePost(slug);
  revalidatePath(`/blog/${slug}`);
  return Response.json({ success: true });
}
```

### Memoization

```typescript
'use client';

import { memo, useMemo, useCallback } from 'react';

// Memoize expensive computations
function ExpensiveComponent({ items }: { items: Item[] }) {
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.price - b.price);
  }, [items]);
  
  const handleClick = useCallback((id: string) => {
    // Handle click
  }, []);
  
  return (
    <div>
      {sortedItems.map(item => (
        <ItemCard key={item.id} item={item} onClick={handleClick} />
      ))}
    </div>
  );
}

// Memoize components
const ItemCard = memo(function ItemCard({ item, onClick }) {
  return <div onClick={() => onClick(item.id)}>{item.name}</div>;
});
```

### Web Vitals Monitoring

```typescript
// app/layout.tsx or _app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## SEO and Metadata

### Metadata API

```typescript
// app/layout.tsx (Root metadata)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'My App',
    template: '%s | My App',
  },
  description: 'Application description',
  keywords: ['keyword1', 'keyword2'],
  authors: [{ name: 'Author Name' }],
  creator: 'Author Name',
  publisher: 'Publisher Name',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://example.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'es-ES': '/es-ES',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://example.com',
    siteName: 'My App',
    title: 'My App',
    description: 'Application description',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'My App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My App',
    description: 'Application description',
    images: ['/twitter-image.jpg'],
    creator: '@username',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'verification_token',
    yandex: 'verification_token',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Page-Level Metadata

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);
  
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.image],
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  return <article>{post.content}</article>;
}
```

### Structured Data (JSON-LD)

```typescript
// app/blog/[slug]/page.tsx
export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: post.image,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author,
    },
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>{post.content}</article>
    </>
  );
}
```

### Sitemap Generation

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://example.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://example.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
```

### Robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  };
}
```

---

## Security Best Practices

### Input Validation and Sanitization

```typescript
// Use Zod for validation
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(120),
});

// In API route
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = userSchema.parse(body);
    // Process validated data
  } catch (error) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

### Authentication and Authorization

```typescript
// lib/auth.ts
import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

export async function getSession(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const payload = verify(token, process.env.JWT_SECRET!);
    return payload;
  } catch {
    return null;
  }
}

// Middleware
export async function middleware(request: NextRequest) {
  const session = await getSession(request);
  
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### Environment Variables

```typescript
// .env.local (never commit)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
API_KEY=your-api-key

// Access in code
const dbUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;

// Type safety
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    JWT_SECRET: string;
    API_KEY: string;
  }
}
```

### CSRF Protection

```typescript
// Use SameSite cookies
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Set-Cookie',
            value: 'SameSite=Strict; Secure; HttpOnly',
          },
        ],
      },
    ];
  },
};
```

### SQL Injection Prevention

```typescript
// Use parameterized queries
// ❌ Bad
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Good
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);

// Or use an ORM
const user = await db.users.findUnique({
  where: { id: userId },
});
```

### XSS Prevention

```typescript
// Sanitize user input
import DOMPurify from 'isomorphic-dompurify';

export function SafeHTML({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Or use React's built-in escaping (default)
export function SafeText({ text }: { text: string }) {
  return <div>{text}</div>; // Automatically escaped
}
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
});

export function checkRateLimit(identifier: string): boolean {
  const count = rateLimit.get(identifier) as number | undefined;
  
  if (count && count >= 10) {
    return false; // Rate limit exceeded
  }
  
  rateLimit.set(identifier, (count || 0) + 1);
  return true;
}

// Usage in API route
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // Process request
}
```

### Security Headers

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

---

## Environment Configuration

### Environment Variables

```bash
# .env.local (local development, gitignored)
DATABASE_URL=postgresql://localhost:5432/mydb
NEXT_PUBLIC_API_URL=http://localhost:3000

# .env.development (development defaults)
DATABASE_URL=postgresql://dev-db:5432/mydb

# .env.production (production defaults)
DATABASE_URL=postgresql://prod-db:5432/mydb

# .env.example (template, committed)
DATABASE_URL=postgresql://user:password@host:port/database
NEXT_PUBLIC_API_URL=https://api.example.com
```

### Environment Variable Rules

1. **Server-only variables**: No `NEXT_PUBLIC_` prefix
   - Accessible only in Server Components, API routes, Server Actions
   - Never exposed to the browser

2. **Client-accessible variables**: `NEXT_PUBLIC_` prefix
   - Exposed to the browser
   - Use sparingly and never include secrets

3. **Type safety**: Create type definitions

```typescript
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    // Server-only
    DATABASE_URL: string;
    JWT_SECRET: string;
    
    // Client-accessible
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_APP_NAME: string;
  }
}
```

### Configuration Management

```typescript
// lib/config.ts
const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'My App',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout: 30000,
  },
  database: {
    url: process.env.DATABASE_URL!,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
} as const;

// Validate required variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
```

---

## Styling and Design Systems

### CSS Modules

```typescript
// components/Button/Button.module.css
.button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: var(--primary-color);
  color: white;
}

.primary {
  background-color: var(--primary-color);
}

.secondary {
  background-color: var(--secondary-color);
}

// components/Button/Button.tsx
import styles from './Button.module.css';

export function Button({ variant = 'primary', children }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  );
}
```

### Tailwind CSS

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0070f3',
          dark: '#0051cc',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### CSS-in-JS (Styled Components / Emotion)

```typescript
'use client';

import styled from 'styled-components';

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: ${props => 
    props.variant === 'primary' ? '#0070f3' : '#6c757d'};
  color: white;
  
  &:hover {
    opacity: 0.9;
  }
`;

export function StyledButton({ variant, children }) {
  return <Button variant={variant}>{children}</Button>;
}
```

### Design System Structure

```
components/
├── ui/                    # Primitive components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   └── index.ts
│   ├── Input/
│   └── Card/
├── layout/                # Layout components
│   ├── Header/
│   ├── Footer/
│   └── Sidebar/
└── features/              # Feature-specific components
    ├── UserProfile/
    └── ProductCard/
```

### Theme Management

```typescript
// lib/theme.ts
export const theme = {
  colors: {
    primary: '#0070f3',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const;
```

---

## Error Handling and Logging

### Error Boundaries

```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

// app/global-error.tsx (root error boundary)
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### Not Found Pages

```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>
      <Link href="/">Return Home</Link>
    </div>
  );
}
```

### API Route Error Handling

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    
    // Log to error tracking service
    logError(error, { context: 'GET /api/users' });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : undefined,
      },
      { status: 500 }
    );
  }
}
```

### Server Action Error Handling

```typescript
'use server';

import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    
    // Validate
    if (!name || !email) {
      return {
        success: false,
        error: 'Name and email are required',
      };
    }
    
    const user = await db.users.create({ data: { name, email } });
    revalidatePath('/users');
    
    return { success: true, user };
  } catch (error) {
    logError(error, { context: 'createUser' });
    
    return {
      success: false,
      error: 'Failed to create user',
    };
  }
}
```

### Logging Strategy

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };
    
    // Console logging
    console[level](JSON.stringify(logEntry));
    
    // Send to logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(logEntry);
    }
  }
  
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      },
    });
  }
  
  private sendToLoggingService(logEntry: unknown) {
    // Integrate with logging service (e.g., Sentry, LogRocket, etc.)
  }
}

export const logger = new Logger();
```

### Error Tracking

```typescript
// lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Usage
try {
  // Risky operation
} catch (error) {
  captureException(error as Error, { userId, action: 'createUser' });
  throw error;
}
```

---

## Testing Strategies

### Testing Setup

```typescript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### Unit Testing

```typescript
// __tests__/utils/formatDate.test.ts
import { formatDate } from '@/lib/utils/formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('January 15, 2024');
  });
  
  it('handles invalid date', () => {
    expect(() => formatDate(new Date('invalid'))).toThrow();
  });
});
```

### Component Testing

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/user-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from '@/components/features/UserProfile';

describe('User Profile Flow', () => {
  it('allows user to update profile', async () => {
    render(<UserProfile userId="123" />);
    
    const nameInput = screen.getByLabelText('Name');
    await userEvent.type(nameInput, 'John Doe');
    
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Profile updated')).toBeInTheDocument();
    });
  });
});
```

### API Route Testing

```typescript
// __tests__/api/users.test.ts
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/users/route';

describe('/api/users', () => {
  it('returns users', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });
    
    const response = await GET(req as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### E2E Testing (Playwright)

```typescript
// e2e/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test('user can register', async ({ page }) => {
  await page.goto('/register');
  
  await page.fill('[name="name"]', 'John Doe');
  await page.fill('[name="email"]', 'john@example.com');
  await page.fill('[name="password"]', 'password123');
  
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Welcome, John Doe')).toBeVisible();
});
```

### Test Coverage

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## CI/CD and Deployment

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Build succeeds without errors
- [ ] All tests pass
- [ ] Security headers configured
- [ ] Error tracking set up
- [ ] Analytics configured
- [ ] Performance monitoring enabled
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Environment-Specific Configurations

```typescript
// next.config.ts
const nextConfig = {
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
  }),
};
```

---

## Code Quality, Linting, and Formatting

### ESLint Configuration

```javascript
// eslint.config.mjs
import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

### TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Pre-commit Hooks (Husky)

```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Code Review Guidelines

1. **Functionality**: Does it work as intended?
2. **Performance**: Any performance implications?
3. **Security**: Any security vulnerabilities?
4. **Testing**: Are there adequate tests?
5. **Documentation**: Is complex logic documented?
6. **Consistency**: Follows project standards?
7. **Accessibility**: Meets accessibility requirements?

---

## Scalability and Maintainability

### Code Organization Principles

1. **DRY (Don't Repeat Yourself)**: Extract common logic
2. **SOLID Principles**: Single responsibility, open/closed, etc.
3. **Separation of Concerns**: Clear boundaries between layers
4. **Composition over Inheritance**: Prefer composition
5. **YAGNI (You Aren't Gonna Need It)**: Don't over-engineer

### Performance Monitoring

```typescript
// lib/performance.ts
export function reportWebVitals(metric: any) {
  // Send to analytics
  if (metric.label === 'web-vital') {
    // Log to your analytics service
    console.log(metric);
  }
}

// app/layout.tsx
import { reportWebVitals } from '@/lib/performance';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
                  onCLS(reportWebVitals);
                  onFID(reportWebVitals);
                  onFCP(reportWebVitals);
                  onLCP(reportWebVitals);
                  onTTFB(reportWebVitals);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
```

### Database Optimization

```typescript
// Use connection pooling
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use indexes
// migrations/add_user_email_index.sql
CREATE INDEX idx_users_email ON users(email);

// Batch operations
async function createManyUsers(users: User[]) {
  return await db.$transaction(
    users.map(user => db.users.create({ data: user }))
  );
}
```

### Caching Strategies

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedUsers = unstable_cache(
  async () => {
    return await db.users.findMany();
  },
  ['users'],
  {
    revalidate: 3600, // 1 hour
    tags: ['users'],
  }
);
```

### Monitoring and Observability

- **Application Performance Monitoring (APM)**: New Relic, Datadog
- **Error Tracking**: Sentry, Rollbar
- **Logging**: LogRocket, Papertrail
- **Analytics**: Google Analytics, Plausible
- **Uptime Monitoring**: UptimeRobot, Pingdom

### Documentation Standards

1. **Code Comments**: Explain why, not what
2. **README**: Project setup and overview
3. **API Documentation**: OpenAPI/Swagger
4. **Architecture Decisions**: ADR (Architecture Decision Records)
5. **Component Documentation**: Storybook or similar

---

## Conclusion

This document serves as a living guide for Next.js development standards. It should be:

- **Regularly Updated**: As the project evolves and best practices change
- **Team Consensus**: All team members should contribute and agree
- **Enforced**: Through code reviews, linting, and automated checks
- **Practical**: Focus on real-world scenarios and solutions

For questions or suggestions, please open a discussion or pull request.

---

**Last Updated**: 2025  
**Maintained By**: Development Team  
**Version**: 1.0
