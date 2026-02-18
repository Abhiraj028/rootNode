create table users(
    id bigserial primary key,
    name varchar(255) not null,
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    email_verified boolean not null default false,
    deleted_at timestamptz
);




create table organisations(
    id bigserial primary key,
    name varchar(255) not null,
    slug varchar(25) not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by bigint not null references users(id),
    deleted_at timestamptz,
    deleted_by bigint references users(id) on delete set null
);




create type org_role as enum ('admin','lead','member');

create table memberships(
    id bigserial primary key,
    org_id bigint not null references organisations(id) on delete restrict,
    user_id bigint not null references users(id) on delete restrict,
    role org_role not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    invited_by bigint references users(id) on delete set null
);

create unique index idx_memberships on memberships(user_id, org_id) where deleted_at is null;
create index idx_memberships_org_id on memberships(org_id);




create table workspaces(
    id bigserial primary key,
    org_id bigint not null references organisations(id) on delete restrict,
    name varchar(255) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by bigint not null references users(id),
    deleted_at timestamptz,
    deleted_by bigint references users(id) on delete set null,
);

create unique index idx_workspaces_org_id_name_active on workspaces(org_id, name) where deleted_at is null;




create table documents(
    id bigserial primary key,
    workspace_id bigint not null references workspaces(id) on delete restrict,
    parent_id bigint references documents(id) on delete restrict,
    name varchar(255) not null,
    title varchar(255) not null,
    content text not null,
    created_by bigint not null references users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    deleted_by bigint references users(id) on delete set null
    
);

create unique index idx_documents_active on documents(workspace_id, parent_id, name) where deleted_at is null;
create index idx_documents_parent_id on documents(parent_id);
create index idx_documents_workspace_id on documents(workspace_id);




create table token_table(
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade,
    token_hash text not null unique,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz
);

create index idx_token_table_user_id on token_table(user_id);