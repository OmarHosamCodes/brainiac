-- Merge tasks that share the same project + normalized title, then enforce uniqueness.
-- Title key: lower(trim(regexp_replace(title, '\s+', ' ', 'g'))) — must match normalizeTaskTitle().

CREATE TABLE IF NOT EXISTS "_agency_ops_task_title_dupes_migration" (
	"dupe_id" text PRIMARY KEY,
	"canonical_id" text NOT NULL
);
--> statement-breakpoint

INSERT INTO "_agency_ops_task_title_dupes_migration" ("dupe_id", "canonical_id")
WITH ranked AS (
	SELECT
		id,
		project_id,
		lower(trim(regexp_replace(title, '\s+', ' ', 'g'))) AS title_key,
		ROW_NUMBER() OVER (
			PARTITION BY project_id, lower(trim(regexp_replace(title, '\s+', ' ', 'g')))
			ORDER BY created_at ASC, id ASC
		) AS rn
	FROM agency_ops_project_task
)
SELECT
	r.id AS dupe_id,
	c.id AS canonical_id
FROM ranked r
INNER JOIN ranked c
	ON c.project_id = r.project_id
	AND c.title_key = r.title_key
	AND c.rn = 1
WHERE r.rn > 1
ON CONFLICT DO NOTHING;
--> statement-breakpoint

UPDATE agency_ops_project_task AS t
SET
	assigned_to_team = true,
	updated_at = now()
FROM "_agency_ops_task_title_dupes_migration" AS d
INNER JOIN agency_ops_project_task AS dupe ON dupe.id = d.dupe_id
WHERE t.id = d.canonical_id
	AND dupe.assigned_to_team = true
	AND t.assigned_to_team = false;
--> statement-breakpoint

UPDATE agency_ops_time_entry AS e
SET task_id = d.canonical_id
FROM "_agency_ops_task_title_dupes_migration" AS d
WHERE e.task_id = d.dupe_id;
--> statement-breakpoint

UPDATE agency_ops_active_timer AS t
SET task_id = d.canonical_id
FROM "_agency_ops_task_title_dupes_migration" AS d
WHERE t.task_id = d.dupe_id;
--> statement-breakpoint

INSERT INTO agency_ops_project_task_assignee (task_id, user_id, created_at)
SELECT d.canonical_id, a.user_id, a.created_at
FROM agency_ops_project_task_assignee AS a
INNER JOIN "_agency_ops_task_title_dupes_migration" AS d ON d.dupe_id = a.task_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint

DELETE FROM agency_ops_project_task_assignee AS a
USING agency_ops_project_task AS t
WHERE a.task_id = t.id
	AND t.assigned_to_team = true
	AND t.id IN (SELECT canonical_id FROM "_agency_ops_task_title_dupes_migration");
--> statement-breakpoint

INSERT INTO agency_ops_project_task_member_status (
	task_id,
	user_id,
	status,
	completed_at,
	created_at,
	updated_at
)
SELECT
	d.canonical_id,
	ms.user_id,
	ms.status,
	ms.completed_at,
	ms.created_at,
	ms.updated_at
FROM agency_ops_project_task_member_status AS ms
INNER JOIN "_agency_ops_task_title_dupes_migration" AS d ON d.dupe_id = ms.task_id
ON CONFLICT (task_id, user_id) DO UPDATE SET
	status = CASE
		WHEN agency_ops_project_task_member_status.status = 'done'
			OR EXCLUDED.status = 'done' THEN 'done'
		WHEN agency_ops_project_task_member_status.status = 'in_progress'
			OR EXCLUDED.status = 'in_progress' THEN 'in_progress'
		ELSE 'open'
	END,
	completed_at = CASE
		WHEN agency_ops_project_task_member_status.status = 'done'
			OR EXCLUDED.status = 'done'
		THEN COALESCE(agency_ops_project_task_member_status.completed_at, EXCLUDED.completed_at, now())
		ELSE NULL
	END,
	updated_at = now();
--> statement-breakpoint

UPDATE agency_ops_task_thread AS dt
SET task_id = d.canonical_id
FROM "_agency_ops_task_title_dupes_migration" AS d
WHERE dt.task_id = d.dupe_id
	AND NOT EXISTS (
		SELECT 1
		FROM agency_ops_task_thread AS ct
		WHERE ct.task_id = d.canonical_id
	)
	AND dt.id = (
		SELECT dt2.id
		FROM agency_ops_task_thread AS dt2
		INNER JOIN "_agency_ops_task_title_dupes_migration" AS d2 ON d2.dupe_id = dt2.task_id
		WHERE d2.canonical_id = d.canonical_id
		ORDER BY dt2.created_at ASC, dt2.id ASC
		LIMIT 1
	);
--> statement-breakpoint

UPDATE agency_ops_task_message AS m
SET thread_id = ct.id
FROM agency_ops_task_thread AS dt
INNER JOIN "_agency_ops_task_title_dupes_migration" AS d ON d.dupe_id = dt.task_id
INNER JOIN agency_ops_task_thread AS ct ON ct.task_id = d.canonical_id
WHERE m.thread_id = dt.id
	AND dt.id <> ct.id;
--> statement-breakpoint

DELETE FROM agency_ops_project_task AS t
USING "_agency_ops_task_title_dupes_migration" AS d
WHERE t.id = d.dupe_id;
--> statement-breakpoint

DROP TABLE IF EXISTS "_agency_ops_task_title_dupes_migration";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_project_task_project_title_unique"
ON "agency_ops_project_task" (
	"project_id",
	(lower(trim(regexp_replace("title", '\s+', ' ', 'g'))))
);
