-- Drop persisted refresh tokens. Refresh JWTs are validated statelessly.
DROP TABLE IF EXISTS "RefreshToken";
