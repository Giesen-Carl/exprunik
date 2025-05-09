# Use the official PostgreSQL image from the Docker Hub
FROM postgres:latest

ARG POSTGRES_DB=express_db
ARG POSTGRES_USER=admin

# Set environment variables for the default user, password, and database
ENV POSTGRES_USER=$POSTGRES_USER
ENV POSTGRES_DB=$POSTGRES_DB

# Expose PostgreSQL port (5432)
EXPOSE 5432