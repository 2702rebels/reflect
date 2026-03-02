# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev          # Vite dev server only (port 1420)
pnpm tauri dev    # Full Tauri app in development mode

# Building
pnpm build        # TypeScript check + Vite frontend build
pnpm build-app    # Build full Tauri desktop app (Rust + frontend)

# Linting & Formatting
pnpm lint         # ESLint + TypeScript check
pnpm lint:fix     # Auto-fix ESLint issues
pnpm format       # Prettier format all files
```

> Requires Node >=21 and pnpm >=10.

**Mock data development:** Create `.env.local` with `VITE_MOCK_MODE=1` to use `MockNetworkTablesSource` instead of a live robot connection.

**Tauri version sync:** When updating Tauri, update both the npm package (`@tauri-apps/api`) and the Rust crate (`src-tauri/Cargo.toml`) to matching versions, then run `cargo update` in `src-tauri/`.

## Architecture

This is a cross-platform FRC (FIRST Robotics) dashboard app built with React 19 + Vite + TypeScript for the frontend and Tauri 2 (Rust) for the desktop shell. The Rust backend is minimal—it only wires up three Tauri plugins (store, fs, dialog). All application logic lives in the frontend.

### State Management (Zustand — `src/stores/`)

| Store | Responsibility |
|---|---|
| `Workspace.ts` | Dashboard layout, widget state, viewport (pan/zoom), design mode, persistence via Tauri store |
| `Data.ts` | NetworkTables connection, hierarchical data tree with binary-search lookup |
| `Settings.ts` | Robot address, ping settings, persisted via Tauri store |

Stores use Zustand with immer middleware. `TauriStoreStorage.ts` bridges Zustand persistence to the Tauri store plugin.

### Widget System (`src/widgets/`)

Each widget is a self-contained React component registered in a central registry. Widgets subscribe to NetworkTables topics via the Data store. Widget layout, sizing, and props are managed in the Workspace store. 20+ widget types: Camera, Swerve, Gyro, Field2D, Robot3D, ChartLine, MatchTime, Chooser, Slider, etc.

### Dashboard & Viewport (`src/parts/`)

- `Dashboard.tsx` — top-level container, wraps everything in dnd-kit's `DndContext`
- `DashboardView.tsx` — renders widgets in a resizable/draggable grid
- `ViewportPane.tsx` — pan/zoom viewport (uses `@xyflow/system`)
- `WidgetPropsEditorModal.tsx` — inline property editing for widgets

### Data Flow

`NetworkTablesSource` (or `MockNetworkTablesSource` in dev) → `Data` store → widgets subscribe to individual NT topics. Real robot connects via `@2702rebels/ntcore`.

### Path Alias

`@ui/*` resolves to `src/components/*` (Radix UI-based component library).

### Java Library (`reflectlib/`)

Standalone Java structs (`MatchTime`, `SwerveTelemetry`) for FRC robot code to serialize telemetry data compatible with this dashboard. Not part of the JS/Rust build.
