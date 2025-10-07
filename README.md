# Dusan Tomic - Personal Portfolio

A modern, responsive personal portfolio website built with Next.js, Framer Motion, and Nunito Sans font.

## Features

- **Two-column layout**: Sticky left panel with tabbed navigation and scrollable right panel with project cards
- **Smooth animations**: Framer Motion transitions between tab content
- **Responsive design**: Mobile-first approach with responsive breakpoints
- **Modern typography**: Nunito Sans font family from Google Fonts
- **Clean design system**: Minimalist design with soft shadows and rounded corners
- **SEO support**: Meta robots noindex support for private URLs (`?private=true`)

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Framer Motion** - Smooth animations and transitions
- **Tailwind CSS** - Utility-first CSS framework
- **Nunito Sans** - Google Fonts typography

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with font configuration
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles
└── components/
    ├── LeftPanel.tsx      # Left navigation panel with tabs
    ├── TabContent.tsx     # Tab content with Intro/Resume/About
    ├── RightPanel.tsx     # Right panel with project grid
    ├── ProjectCard.tsx    # Individual project card component
    └── MetaRobots.tsx     # Meta robots handling for private URLs
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Private URL Support

The portfolio supports private URLs by adding `?private=true` to the URL, which will add a `noindex` meta tag to prevent search engine indexing.

Example: `http://localhost:3000?private=true`

## Design System

- **Colors**: Black text on white background with soft gray accents
- **Typography**: Nunito Sans font family with various weights
- **Spacing**: Consistent padding and margins using Tailwind utilities
- **Shadows**: Soft drop shadows for project cards
- **Animations**: Smooth transitions using Framer Motion

## Responsive Breakpoints

- **Mobile**: Single column layout, full-width components
- **Desktop**: Two-column layout with sticky left panel
- **Tablet**: Responsive grid with optimized spacing