#!/bin/bash
# Runs once, on an empty data directory, as the postgres superuser: creates Keycloak's role and database.
# psql reads the password from the secret file itself, so it is on no command line and in no output.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
\set kc_password `cat /run/secrets/db_keycloak_password`
CREATE ROLE keycloak LOGIN PASSWORD :'kc_password';
CREATE DATABASE keycloak OWNER keycloak;
SQL
