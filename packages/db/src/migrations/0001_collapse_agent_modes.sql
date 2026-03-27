UPDATE "dashboard_conversation"
SET "tool_preset" = CASE
  WHEN "tool_preset" IN ('auto', 'direct', 'workspace-search') THEN 'ask'
  WHEN "tool_preset" = 'deep-inspect' THEN 'agent'
  ELSE "tool_preset"
END;
