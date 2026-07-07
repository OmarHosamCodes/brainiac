.
├── apps
│   ├── server
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── app.ts
│   │   │   ├── cleanup-agency-operator-nodes.ts
│   │   │   ├── clear-team-data.ts
│   │   │   ├── grant-lifetime-pro.ts
│   │   │   ├── import-clockify-backfill.ts
│   │   │   ├── import-clockify.ts
│   │   │   ├── index.ts
│   │   │   ├── lib
│   │   │   │   ├── clockify-import.test.ts
│   │   │   │   ├── clockify-import.ts
│   │   │   │   ├── ensure-credential-account.ts
│   │   │   │   ├── handlers.ts
│   │   │   │   ├── notification-digest.ts
│   │   │   │   ├── seed-agency-scale.ts
│   │   │   │   ├── seed-agency-types.ts
│   │   │   │   ├── startup.ts
│   │   │   │   ├── task-attachments.ts
│   │   │   │   ├── user-avatar.ts
│   │   │   │   ├── web-push.ts
│   │   │   │   ├── ws-context.ts
│   │   │   │   └── ws-handler.ts
│   │   │   ├── seed-agency.ts
│   │   │   ├── seed-massive.ts
│   │   │   ├── seed.ts
│   │   │   ├── types
│   │   │   │   └── web-push.d.ts
│   │   │   └── verify-clockify-backfill.ts
│   │   ├── tsconfig.json
│   │   └── tsdown.config.ts
│   └── web
│   ├── components.json
│   ├── index.html
│   ├── package.json
│   ├── perf
│   │   ├── baseline.json
│   │   ├── budgets.json
│   │   ├── global-setup.mjs
│   │   ├── perf-report.json
│   │   ├── perf-report.md
│   │   ├── report.mjs
│   │   ├── routes.mjs
│   │   ├── run-lighthouse.mjs
│   │   └── score.mjs
│   ├── public
│   │   ├── favicon.svg
│   │   ├── favicon-tracking.svg
│   │   ├── fonts
│   │   │   ├── ibm-plex-mono-latin-400.woff2
│   │   │   ├── ibm-plex-sans-latin-400.woff2
│   │   │   ├── ibm-plex-sans-latin-600.woff2
│   │   │   └── ibm-plex-sans-latin-700.woff2
│   │   ├── logo-animation.svg
│   │   ├── robots.txt
│   │   └── sw.js
│   ├── scripts
│   │   └── write-railway-server.mjs
│   ├── src
│   │   ├── app.tsx
│   │   ├── authenticated-routes.tsx
│   │   ├── components
│   │   │   ├── agency
│   │   │   │   ├── agency-attachment-grid.tsx
│   │   │   │   ├── agency-billing-surface.tsx
│   │   │   │   ├── agency-clients-surface.tsx
│   │   │   │   ├── agency-command-bar-ui.tsx
│   │   │   │   ├── agency-dashboard-command-bar.tsx
│   │   │   │   ├── agency-dashboard-surface.tsx
│   │   │   │   ├── agency-list-filter-command-bar.tsx
│   │   │   │   ├── agency-logo-loader.tsx
│   │   │   │   ├── agency-management-surface.tsx
│   │   │   │   ├── agency-member-avatar.tsx
│   │   │   │   ├── agency-member-chooser.tsx
│   │   │   │   ├── agency-mini-timer.tsx
│   │   │   │   ├── agency-multi-select-filter.tsx
│   │   │   │   ├── agency-notifications.tsx
│   │   │   │   ├── agency-placeholder-surface.tsx
│   │   │   │   ├── agency-presence-avatars.tsx
│   │   │   │   ├── agency-project-chooser.tsx
│   │   │   │   ├── agency-project-create-dialog.tsx
│   │   │   │   ├── agency-project-detail.tsx
│   │   │   │   ├── agency-project-hue-dot.tsx
│   │   │   │   ├── agency-project-manager.tsx
│   │   │   │   ├── agency-projects-table.tsx
│   │   │   │   ├── agency-projects-virtual-table.tsx
│   │   │   │   ├── agency-project-tasks.tsx
│   │   │   │   ├── agency-pro-upsell.tsx
│   │   │   │   ├── agency-report-activity-menu.tsx
│   │   │   │   ├── agency-report-creator-header.tsx
│   │   │   │   ├── agency-report-creator-surface.tsx
│   │   │   │   ├── agency-report-creator-table.tsx
│   │   │   │   ├── agency-report-duration-cell.tsx
│   │   │   │   ├── agency-report-entry-context-menu.tsx
│   │   │   │   ├── agency-report-history-menu.tsx
│   │   │   │   ├── agency-reports-surface.tsx
│   │   │   │   ├── agency-reports-table.tsx
│   │   │   │   ├── agency-resourcing-surface.tsx
│   │   │   │   ├── agency-search-highlight.tsx
│   │   │   │   ├── agency-segment-bar.tsx
│   │   │   │   ├── agency-segment-body.tsx
│   │   │   │   ├── agency-subtitle-breadcrumb.tsx
│   │   │   │   ├── agency-task-chooser.tsx
│   │   │   │   ├── agency-task-client-group.tsx
│   │   │   │   ├── agency-task-composer.tsx
│   │   │   │   ├── agency-task-create-inline.tsx
│   │   │   │   ├── agency-task-list.tsx
│   │   │   │   ├── agency-task-media-player.tsx
│   │   │   │   ├── agency-task-rail-summary.tsx
│   │   │   │   ├── agency-task-row.tsx
│   │   │   │   ├── agency-task-thread.tsx
│   │   │   │   ├── agency-task-title-chooser.tsx
│   │   │   │   ├── agency-team-breadcrumb.tsx
│   │   │   │   ├── agency-time-entries-log.tsx
│   │   │   │   ├── agency-time-entry-actions.tsx
│   │   │   │   ├── agency-time-entry-day-group.tsx
│   │   │   │   ├── agency-time-entry-inline-edit.tsx
│   │   │   │   ├── agency-time-entry-project-label.tsx
│   │   │   │   ├── agency-time-entry-row.tsx
│   │   │   │   ├── agency-time-entry-week-group.tsx
│   │   │   │   ├── agency-time-summary.tsx
│   │   │   │   ├── agency-time-tracker.tsx
│   │   │   │   ├── agency-voice-recorder.tsx
│   │   │   │   ├── agency-work-surface.tsx
│   │   │   │   ├── journey
│   │   │   │   │   ├── agency-project-journey-stepper-dialog.tsx
│   │   │   │   │   └── agency-project-journey-stepper.tsx
│   │   │   │   ├── settings
│   │   │   │   │   ├── agency-settings-colors-pane.tsx
│   │   │   │   │   ├── agency-settings-integrations-pane.tsx
│   │   │   │   │   ├── agency-settings-rates-pane.tsx
│   │   │   │   │   ├── agency-settings-tenure-member-detail.tsx
│   │   │   │   │   ├── agency-settings-tenure-pane.tsx
│   │   │   │   │   ├── agency-settings-tenure-policy.tsx
│   │   │   │   │   └── agency-settings-tenure-roster.tsx
│   │   │   │   └── work
│   │   │   │   ├── task-list
│   │   │   │   │   ├── agency-member-chooser-view.tsx
│   │   │   │   │   ├── agency-mini-timer-view.tsx
│   │   │   │   │   ├── agency-project-chooser-view.tsx
│   │   │   │   │   ├── agency-task-client-group-view.tsx
│   │   │   │   │   ├── agency-task-create-inline-view.tsx
│   │   │   │   │   ├── agency-task-display-row-view.tsx
│   │   │   │   │   ├── agency-task-group-row-view.tsx
│   │   │   │   │   ├── agency-task-journey-row-view.tsx
│   │   │   │   │   ├── agency-task-list-view.tsx
│   │   │   │   │   ├── agency-task-project-group-view.tsx
│   │   │   │   │   ├── agency-task-row-view.tsx
│   │   │   │   │   ├── agency-task-title-chooser-view.tsx
│   │   │   │   │   └── agency-task-virtual-list.tsx
│   │   │   │   ├── task-thread
│   │   │   │   │   ├── agency-attachment-chip-view.tsx
│   │   │   │   │   ├── agency-attachment-grid-view.tsx
│   │   │   │   │   ├── agency-attachment-inline-view.tsx
│   │   │   │   │   ├── agency-attachment-list-view.tsx
│   │   │   │   │   ├── agency-attachments-view.tsx
│   │   │   │   │   ├── agency-task-voice-recorder-view.tsx
│   │   │   │   │   ├── task-thread-agent-message.tsx
│   │   │   │   │   ├── task-thread-composer.tsx
│   │   │   │   │   ├── task-thread-empty-state.tsx
│   │   │   │   │   ├── task-thread-message-list.tsx
│   │   │   │   │   ├── task-thread-message.tsx
│   │   │   │   │   ├── task-thread-user-message.tsx
│   │   │   │   │   └── task-thread-view.tsx
│   │   │   │   ├── time-entries
│   │   │   │   │   ├── agency-task-chooser-view.tsx
│   │   │   │   │   ├── agency-time-entries-log-view.tsx
│   │   │   │   │   ├── agency-time-entry-day-group-view.tsx
│   │   │   │   │   ├── agency-time-entry-row-view.tsx
│   │   │   │   │   ├── agency-time-entry-week-group-view.tsx
│   │   │   │   │   └── agency-time-tracker-view.tsx
│   │   │   │   └── work-surface
│   │   │   │   ├── agency-work-surface-empty-view.tsx
│   │   │   │   ├── agency-work-surface-error-view.tsx
│   │   │   │   ├── agency-work-surface-layout-view.tsx
│   │   │   │   ├── agency-work-surface-loading-view.tsx
│   │   │   │   ├── agency-work-surface-mobile-tabs-view.tsx
│   │   │   │   └── agency-work-surface-timer-strip-view.tsx
│   │   │   ├── app-shell-account-menu.tsx
│   │   │   ├── app-shell-breadcrumbs.tsx
│   │   │   ├── app-shell-page.tsx
│   │   │   ├── app-shell-portal.tsx
│   │   │   ├── app-shell-rail-toggle.tsx
│   │   │   ├── app-shell-rail.tsx
│   │   │   ├── app-shell-topbar.tsx
│   │   │   ├── app-shell.tsx
│   │   │   ├── auth
│   │   │   │   └── protected-route.tsx
│   │   │   ├── canvas
│   │   │   │   ├── canvas-flow-context.tsx
│   │   │   │   ├── workspace-flow-edge.tsx
│   │   │   │   └── workspace-flow-node.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── agent-chat
│   │   │   │   │   ├── dashboard-agent-chat-header.tsx
│   │   │   │   │   ├── dashboard-agent-composer.tsx
│   │   │   │   │   ├── dashboard-agent-conversation-dialogs.tsx
│   │   │   │   │   ├── dashboard-agent-empty-state.tsx
│   │   │   │   │   ├── dashboard-agent-mention-menu.tsx
│   │   │   │   │   ├── dashboard-agent-message-list.tsx
│   │   │   │   │   ├── dashboard-agent-message.tsx
│   │   │   │   │   ├── dashboard-agent-model-library.tsx
│   │   │   │   │   ├── dashboard-agent-thread-rail.tsx
│   │   │   │   │   └── dashboard-agent-tool-trace.tsx
│   │   │   │   ├── dashboard-agent-chat-panel.tsx
│   │   │   │   └── dashboard-workspace-sidebar.tsx
│   │   │   ├── infinite-canvas.tsx
│   │   │   ├── lazy-infinite-canvas.tsx
│   │   │   ├── marketing
│   │   │   │   ├── landing-agency-preview.tsx
│   │   │   │   ├── landing-agent-trace.tsx
│   │   │   │   ├── landing-pricing.tsx
│   │   │   │   ├── landing-workspace-vignette.tsx
│   │   │   │   ├── marketing-brand-lockup.tsx
│   │   │   │   ├── marketing-demo-data.ts
│   │   │   │   ├── marketing-legal-layout.tsx
│   │   │   │   ├── marketing-node-card.tsx
│   │   │   │   ├── neural-canvas-artifact.tsx
│   │   │   │   └── prism-dispersion-artifact.tsx
│   │   │   ├── marketing-page-shell.tsx
│   │   │   ├── marketplace-import-modal.tsx
│   │   │   ├── marketplace-item-card.tsx
│   │   │   ├── marketplace-subtitle-breadcrumb.tsx
│   │   │   ├── shell
│   │   │   │   ├── brand-mark.tsx
│   │   │   │   ├── logo-loader.tsx
│   │   │   │   └── shell-page-transition.tsx
│   │   │   ├── team
│   │   │   │   └── team-settings-modal.tsx
│   │   │   ├── ui
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── command.tsx
│   │   │   │   ├── context-menu.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── sonner.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   └── tooltip.tsx
│   │   │   └── workspace
│   │   │   ├── node
│   │   │   │   ├── block-editor-props.ts
│   │   │   │   ├── blocks
│   │   │   │   │   ├── shared
│   │   │   │   │   │   ├── block-checkbox.tsx
│   │   │   │   │   │   ├── block-field-label.tsx
│   │   │   │   │   │   ├── block-progress-bar.tsx
│   │   │   │   │   │   ├── block-select.tsx
│   │   │   │   │   │   └── pros-cons-helpers.tsx
│   │   │   │   │   ├── workspace-2x2-matrix-block-editor.tsx
│   │   │   │   │   ├── workspace-ai-prompt-block-editor.tsx
│   │   │   │   │   ├── workspace-assumption-tracker-block-editor.tsx
│   │   │   │   │   ├── workspace-authority-scorecard-block-editor.tsx
│   │   │   │   │   ├── workspace-business-model-canvas-block-editor.tsx
│   │   │   │   │   ├── workspace-checklist-block-editor.tsx
│   │   │   │   │   ├── workspace-cohort-health-dashboard-block-editor.tsx
│   │   │   │   │   ├── workspace-collections-tracker-block-editor.tsx
│   │   │   │   │   ├── workspace-content-pipeline-block-editor.tsx
│   │   │   │   │   ├── workspace-content-quality-radar-block-editor.tsx
│   │   │   │   │   ├── workspace-content-roi-tracker-block-editor.tsx
│   │   │   │   │   ├── workspace-course-roadmap-block-editor.tsx
│   │   │   │   │   ├── workspace-custom-block-editor.tsx
│   │   │   │   │   ├── workspace-deal-scoring-matrix-block-editor.tsx
│   │   │   │   │   ├── workspace-decision-block-editor.tsx
│   │   │   │   │   ├── workspace-decision-matrix-block-editor.tsx
│   │   │   │   │   ├── workspace-delegation-matrix-block-editor.tsx
│   │   │   │   │   ├── workspace-eisenhower-matrix-block-editor.tsx
│   │   │   │   │   ├── workspace-forecast-confidence-board-block-editor.tsx
│   │   │   │   │   ├── workspace-habit-grid-block-editor.tsx
│   │   │   │   │   ├── workspace-hook-bank-block-editor.tsx
│   │   │   │   │   ├── workspace-kanban-block-editor.tsx
│   │   │   │   │   ├── workspace-leadership-rhythm-planner-block-editor.tsx
│   │   │   │   │   ├── workspace-learning-outcomes-matrix-block-editor.tsx
│   │   │   │   │   ├── workspace-message-house-block-editor.tsx
│   │   │   │   │   ├── workspace-notes-block-editor.tsx
│   │   │   │   │   ├── workspace-okr-tracker-block-editor.tsx
│   │   │   │   │   ├── workspace-orchestrator-sources-modal.tsx
│   │   │   │   │   ├── workspace-pipeline-funnel-block-editor.tsx
│   │   │   │   │   ├── workspace-pricing-simulator-block-editor.tsx
│   │   │   │   │   ├── workspace-process-block-editor.tsx
│   │   │   │   │   ├── workspace-profitability-cash-flow-block-editor.tsx
│   │   │   │   │   ├── workspace-pros-cons-block-editor.tsx
│   │   │   │   │   ├── workspace-scorecard-block-editor.tsx
│   │   │   │   │   ├── workspace-seat-planner-block-editor.tsx
│   │   │   │   │   ├── workspace-skills-heat-map-block-editor.tsx
│   │   │   │   │   ├── workspace-swot-block-editor.tsx
│   │   │   │   │   ├── workspace-table-block-editor.tsx
│   │   │   │   │   ├── workspace-talent-grid-block-editor.tsx
│   │   │   │   │   ├── workspace-task-list-block-editor.tsx
│   │   │   │   │   ├── workspace-timeline-block-editor.tsx
│   │   │   │   │   ├── workspace-time-orchestrator-block-editor.tsx
│   │   │   │   │   └── workspace-tracker-block-editor.tsx
│   │   │   │   ├── context.tsx
│   │   │   │   ├── workspace-add-block-command.tsx
│   │   │   │   ├── workspace-node-block-renderer.tsx
│   │   │   │   ├── workspace-node-empty-state.tsx
│   │   │   │   └── workspace-node-shell.tsx
│   │   │   ├── workspace-board-status.tsx
│   │   │   ├── workspace-editor-modal.tsx
│   │   │   └── workspace-node-card.tsx
│   │   ├── index.css
│   │   ├── lib
│   │   │   ├── agency
│   │   │   │   ├── agency-boot.ts
│   │   │   │   ├── agency-segment-boot.ts
│   │   │   │   ├── agency-segment-filters.tsx
│   │   │   │   ├── hooks
│   │   │   │   │   └── use-agency-project-journey.ts
│   │   │   │   ├── journey
│   │   │   │   │   └── journey-step-layout.ts
│   │   │   │   ├── live
│   │   │   │   │   ├── agency-live-connected.ts
│   │   │   │   │   ├── agency-live-connection.test.ts
│   │   │   │   │   ├── agency-live-connection.ts
│   │   │   │   │   └── agency-live-handlers.ts
│   │   │   │   ├── reports
│   │   │   │   │   ├── agency-report-fields.test.ts
│   │   │   │   │   ├── agency-report-fields.ts
│   │   │   │   │   ├── agency-report-naming.test.ts
│   │   │   │   │   ├── agency-report-naming.ts
│   │   │   │   │   ├── agency-saved-reports-list.tsx
│   │   │   │   │   ├── fetch-report-entries.ts
│   │   │   │   │   ├── use-agency-report-autosave.ts
│   │   │   │   │   ├── use-agency-report-creator.ts
│   │   │   │   │   └── use-agency-report-label-context.ts
│   │   │   │   ├── use-agency-boot-gate.ts
│   │   │   │   ├── use-agency-list-filters.ts
│   │   │   │   ├── use-agency-time-range-filters.ts
│   │   │   │   └── work
│   │   │   │   ├── containers
│   │   │   │   │   ├── agency-attachment-grid-container.tsx
│   │   │   │   │   ├── agency-member-chooser-container.tsx
│   │   │   │   │   ├── agency-mini-timer-container.tsx
│   │   │   │   │   ├── agency-project-chooser-container.tsx
│   │   │   │   │   ├── agency-task-chooser-container.tsx
│   │   │   │   │   ├── agency-task-list-container.tsx
│   │   │   │   │   ├── agency-task-thread-container.tsx
│   │   │   │   │   ├── agency-task-title-chooser-container.tsx
│   │   │   │   │   ├── agency-time-entries-log-container.tsx
│   │   │   │   │   ├── agency-time-entry-row-container.tsx
│   │   │   │   │   ├── agency-time-tracker-container.tsx
│   │   │   │   │   ├── agency-voice-recorder-container.tsx
│   │   │   │   │   └── agency-work-surface-container.tsx
│   │   │   │   ├── hooks
│   │   │   │   │   ├── use-agency-attachment-grid.ts
│   │   │   │   │   ├── use-agency-elapsed-timer.ts
│   │   │   │   │   ├── use-agency-journey-live-sync.ts
│   │   │   │   │   ├── use-agency-member-chooser.ts
│   │   │   │   │   ├── use-agency-mini-timer.ts
│   │   │   │   │   ├── use-agency-project-chooser.ts
│   │   │   │   │   ├── use-agency-task-chooser.ts
│   │   │   │   │   ├── use-agency-task-list.ts
│   │   │   │   │   ├── use-agency-task-thread.ts
│   │   │   │   │   ├── use-agency-task-title-chooser.ts
│   │   │   │   │   ├── use-agency-time-entries-log.ts
│   │   │   │   │   ├── use-agency-time-entry-row.ts
│   │   │   │   │   ├── use-agency-time-tracker.ts
│   │   │   │   │   ├── use-agency-voice-recorder.ts
│   │   │   │   │   ├── use-agency-work-surface.ts
│   │   │   │   │   ├── use-task-thread-live-sync.ts
│   │   │   │   │   ├── use-task-thread-messaging.ts
│   │   │   │   │   ├── use-task-thread-scroll.test.ts
│   │   │   │   │   └── use-task-thread-scroll.ts
│   │   │   │   ├── task-tracking-state.test.ts
│   │   │   │   ├── task-tracking-state.ts
│   │   │   │   ├── timer-validation.test.ts
│   │   │   │   └── timer-validation.ts
│   │   │   ├── agency-management-sections.ts
│   │   │   ├── agency-segments.ts
│   │   │   ├── agency-settings-sections.ts
│   │   │   ├── auth-client.ts
│   │   │   ├── canvas
│   │   │   │   ├── canvas-types.ts
│   │   │   │   ├── use-canvas-keyboard.ts
│   │   │   │   └── workspace-flow-adapter.ts
│   │   │   ├── constants
│   │   │   │   └── workspace-node-options.ts
│   │   │   ├── env.ts
│   │   │   ├── favicon.ts
│   │   │   ├── hooks
│   │   │   │   └── use-prefers-reduced-motion.ts
│   │   │   ├── lucide-icon.tsx
│   │   │   ├── marketing-prerender.ts
│   │   │   ├── orpc.ts
│   │   │   ├── push.ts
│   │   │   ├── queries
│   │   │   │   ├── agency-optimistic.ts
│   │   │   │   ├── agency-sync.ts
│   │   │   │   ├── agency.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   └── team.ts
│   │   │   ├── query-client.ts
│   │   │   ├── schemas
│   │   │   │   ├── agency-time-entry.ts
│   │   │   │   ├── agency-work.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── workspace-node.ts
│   │   │   ├── shell
│   │   │   │   ├── shell-boot.test.ts
│   │   │   │   ├── shell-boot.ts
│   │   │   │   └── use-shell-boot-gate.ts
│   │   │   ├── tenure-utils.test.ts
│   │   │   ├── tenure-utils.ts
│   │   │   ├── theme.ts
│   │   │   ├── user-avatar-url.ts
│   │   │   ├── utils
│   │   │   │   ├── add-block-command-catalog.ts
│   │   │   │   ├── agency-attachment-utils.test.ts
│   │   │   │   ├── agency-attachment-utils.ts
│   │   │   │   ├── agency-list-search.test.ts
│   │   │   │   ├── agency-list-search.ts
│   │   │   │   ├── agency-live-rpc.ts
│   │   │   │   ├── agency-optimistic-merge.test.ts
│   │   │   │   ├── agency-optimistic-merge.ts
│   │   │   │   ├── agency-presence-members.test.ts
│   │   │   │   ├── agency-presence-members.ts
│   │   │   │   ├── agency-query-cache.test.ts
│   │   │   │   ├── agency-query-cache.ts
│   │   │   │   ├── agency-query-options.ts
│   │   │   │   ├── agency-report-grouping.test.ts
│   │   │   │   ├── agency-report-grouping.ts
│   │   │   │   ├── agency-task-blueprints.test.ts
│   │   │   │   ├── agency-task-blueprints.ts
│   │   │   │   ├── agency-task-journey.test.ts
│   │   │   │   ├── agency-task-journey.ts
│   │   │   │   ├── agency-task-messages-cache.test.ts
│   │   │   │   ├── agency-task-messages-cache.ts
│   │   │   │   ├── agency-task-rail-grouping.test.ts
│   │   │   │   ├── agency-task-rail-grouping.ts
│   │   │   │   ├── agency-task-status.ts
│   │   │   │   ├── agency-task-title-filter.test.ts
│   │   │   │   ├── agency-task-title-filter.ts
│   │   │   │   ├── agency-task-utils.ts
│   │   │   │   ├── agency-thread-motion.test.ts
│   │   │   │   ├── agency-thread-motion.ts
│   │   │   │   ├── agency-ui.ts
│   │   │   │   ├── app-navigation.ts
│   │   │   │   ├── app-shell-ui.ts
│   │   │   │   ├── create-workspace-block.ts
│   │   │   │   ├── dashboard-agent-mentions.ts
│   │   │   │   ├── dashboard-agent-ui.ts
│   │   │   │   ├── dashboard-ui.ts
│   │   │   │   ├── export-agency-report-xlsx.ts
│   │   │   │   ├── format-agency-day-label.ts
│   │   │   │   ├── format-date-time.ts
│   │   │   │   ├── format-duration.ts
│   │   │   │   ├── get-error-debug-details.ts
│   │   │   │   ├── get-error-message.ts
│   │   │   │   ├── group-time-entries.ts
│   │   │   │   ├── initials.ts
│   │   │   │   ├── liquid-glass-ui.tsx
│   │   │   │   ├── orpc-error.ts
│   │   │   │   ├── project-palette.ts
│   │   │   │   ├── render-simple-markdown.ts
│   │   │   │   ├── time-entry-draft.test.ts
│   │   │   │   ├── time-entry-draft.ts
│   │   │   │   ├── workspace-block-presets.ts
│   │   │   │   ├── workspace-block-registry.ts
│   │   │   │   ├── workspace-marketplace.ts
│   │   │   │   ├── workspace-node-connections.test.ts
│   │   │   │   ├── workspace-node-connections.ts
│   │   │   │   ├── workspace-node-dashboard.ts
│   │   │   │   └── workspace-node-formatters.ts
│   │   │   ├── utils.ts
│   │   │   └── workspace
│   │   │   ├── use-node-page.ts
│   │   │   └── use-node-sharing.ts
│   │   ├── main.tsx
│   │   ├── pages
│   │   │   ├── agency-page.tsx
│   │   │   ├── billing-page.tsx
│   │   │   ├── billing-success-page.tsx
│   │   │   ├── dashboard-page.tsx
│   │   │   ├── landing-page.tsx
│   │   │   ├── login-page.tsx
│   │   │   ├── marketplace-page.tsx
│   │   │   ├── node-page.tsx
│   │   │   ├── privacy-page.tsx
│   │   │   └── terms-page.tsx
│   │   ├── providers
│   │   │   ├── auth-provider.tsx
│   │   │   └── query-provider.tsx
│   │   ├── stores
│   │   │   ├── agency-ops.ts
│   │   │   ├── agency-optimistic.ts
│   │   │   ├── agency-task-list.test.ts
│   │   │   ├── agency-task-list.ts
│   │   │   ├── agency-task-messages.test.ts
│   │   │   ├── agency-task-messages.ts
│   │   │   ├── agency-task-thread.ts
│   │   │   ├── agency-time-entries-log.ts
│   │   │   ├── agency-timer.ts
│   │   │   ├── agency-time-tracking.ts
│   │   │   ├── agency-work-surface.ts
│   │   │   ├── app-shell.ts
│   │   │   ├── dashboard-agent-chat.ts
│   │   │   ├── team.ts
│   │   │   ├── theme.ts
│   │   │   └── workspace.ts
│   │   └── styles
│   │   └── workspace-flow.css
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── vite-marketing-prerender.ts
├── artifacts
│   └── prism_dispersion_animation.html
├── bun.lock
├── CONTRIBUTING.md
├── DESIGN.json
├── DESIGN.md
├── DEVELOPMENT.md
├── knip.json
├── nixpacks.toml
├── package.json
├── packages
│   ├── agent
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── client.ts
│   │   │   ├── index.ts
│   │   │   ├── models.ts
│   │   │   ├── tools.test.ts
│   │   │   ├── tools.ts
│   │   │   └── types.ts
│   │   └── tsconfig.json
│   ├── api
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── billing-guard.ts
│   │   │   ├── billing.test.ts
│   │   │   ├── billing.ts
│   │   │   ├── context.ts
│   │   │   ├── dev-errors.ts
│   │   │   ├── image-compression.test.ts
│   │   │   ├── image-compression.ts
│   │   │   ├── index.ts
│   │   │   ├── lib
│   │   │   │   └── redis.ts
│   │   │   ├── procedures.ts
│   │   │   ├── routers
│   │   │   │   ├── agency-ops
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── live.ts
│   │   │   │   │   ├── membership.ts
│   │   │   │   │   ├── saved-reports-service.ts
│   │   │   │   │   ├── service.ts
│   │   │   │   │   ├── task-agent.ts
│   │   │   │   │   ├── task-title.test.ts
│   │   │   │   │   ├── task-title.ts
│   │   │   │   │   ├── tenure-engine.test.ts
│   │   │   │   │   ├── tenure-engine.ts
│   │   │   │   │   └── tenure-service.ts
│   │   │   │   ├── agent
│   │   │   │   │   └── service.ts
│   │   │   │   ├── agent.ts
│   │   │   │   ├── billing
│   │   │   │   │   └── index.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notifications
│   │   │   │   │   ├── copy.ts
│   │   │   │   │   ├── delivery.ts
│   │   │   │   │   ├── fanout-helpers.ts
│   │   │   │   │   ├── fanout.test.ts
│   │   │   │   │   ├── fanout.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── live-bridge.ts
│   │   │   │   │   └── service.ts
│   │   │   │   ├── system.ts
│   │   │   │   ├── team
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── service.ts
│   │   │   │   └── workspace
│   │   │   │   ├── index.ts
│   │   │   │   └── service.ts
│   │   │   ├── schemas
│   │   │   │   ├── agency-ops-completion.test.ts
│   │   │   │   ├── agency-ops.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   └── team.ts
│   │   │   └── storage.ts
│   │   └── tsconfig.json
│   ├── auth
│   │   ├── package.json
│   │   ├── src
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   ├── config
│   │   ├── package.json
│   │   └── tsconfig.base.json
│   ├── db
│   │   ├── docker-compose.yml
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   ├── scripts
│   │   ├── src
│   │   │   ├── index.ts
│   │   │   ├── migrations
│   │   │   │   ├── 0000_perpetual_mephisto.sql
│   │   │   │   ├── 0001_bright_stellaris.sql
│   │   │   │   ├── 0002_normal_whistler.sql
│   │   │   │   ├── 0003_tidy_orion.sql
│   │   │   │   ├── 0004_agency_phase4.sql
│   │   │   │   ├── 0005_agency_project_tasks.sql
│   │   │   │   ├── 0006_agency_task_threads.sql
│   │   │   │   ├── 0007_attachment_metadata.sql
│   │   │   │   ├── 0008_agency_tenure.sql
│   │   │   │   ├── 0009_agency_tenure_fiscal_day.sql
│   │   │   │   ├── 0010_drop_agency_tags_and_links.sql
│   │   │   │   ├── 0011_task_multi_assign.sql
│   │   │   │   ├── 0012_task_member_status.sql
│   │   │   │   ├── 0013_unique_task_title_per_project.sql
│   │   │   │   ├── 0014_member_completion_count.sql
│   │   │   │   ├── 0015_task_blueprint.sql
│   │   │   │   ├── 0016_project_journey.sql
│   │   │   │   ├── 0017_task_is_waste.sql
│   │   │   │   ├── 0018_notifications.sql
│   │   │   │   ├── 0019_agency_saved_reports.sql
│   │   │   │   └── meta
│   │   │   │   ├── 0000_snapshot.json
│   │   │   │   ├── 0001_snapshot.json
│   │   │   │   ├── 0002_snapshot.json
│   │   │   │   └── \_journal.json
│   │   │   ├── schema
│   │   │   │   ├── agency-ops.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── team.ts
│   │   │   │   └── workspace.ts
│   │   │   └── schema.ts
│   │   └── tsconfig.json
│   ├── env
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── helpers.ts
│   │   │   ├── server.ts
│   │   │   ├── vite.ts
│   │   │   └── web.ts
│   │   └── tsconfig.json
│   └── workspace
│   ├── package.json
│   ├── src
│   │   ├── block-categories.ts
│   │   ├── brand.ts
│   │   ├── constants.ts
│   │   ├── content.ts
│   │   ├── dashboard.ts
│   │   ├── education.ts
│   │   ├── finance.ts
│   │   ├── general.ts
│   │   ├── index.ts
│   │   ├── people.ts
│   │   ├── sales.ts
│   │   ├── schemas.ts
│   │   ├── shared.ts
│   │   ├── strategy.ts
│   │   ├── tasks.test.ts
│   │   ├── tasks.ts
│   │   ├── tiers.ts
│   │   └── types.ts
│   └── tsconfig.json
├── PRODUCT.md
├── railway.toml
├── README.md
├── scripts
│   ├── configure-bucket-cors.sh
│   ├── perf
│   │   └── run-benchmarks.mjs
│   ├── railway-start.mjs
│   └── setup.sh
├── skills-lock.json
├── spec
│   ├── agency-update
│   │   └── plan.md
│   └── performance
│   └── benchmarks.md
├── tree.txt
├── tsconfig.json
└── turbo.json

87 directories, 608 files
