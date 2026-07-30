-- Add truncated flag to replay_results
-- Indicates whether the replayed response body was truncated at 1MB

ALTER TABLE replay_results ADD COLUMN truncated BOOLEAN DEFAULT 0;
