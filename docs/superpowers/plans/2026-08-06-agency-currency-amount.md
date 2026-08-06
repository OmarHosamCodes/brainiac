# Unify Agency Currency (Amount + FX) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** One agency-selected currency; every money write stores source + resolved agency `amount`; UI/API never say “cents”; old Money data is migrated.

**Architecture:** Team currency on money settings (soft-locked after first money write). Shared resolve helper turns `(sourceAmount, sourceCurrency)` → agency `amount` via team FX rates. Aggregates sum only resolved `amount`. Frankfurter powers optional rate suggestions.

**Tech Stack:** Drizzle/Postgres, oRPC, React Money UI, Frankfurter API.

See confirmed design: [`../specs/2026-08-06-agency-currency-amount-design.md`](../specs/2026-08-06-agency-currency-amount-design.md).

## Tasks

See Cursor plan `unify_agency_currency` — Task 1–7 (spec-core → verify).
