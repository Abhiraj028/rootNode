create table users(
    id bigserial primary key,
    name varchar(255) not null,
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table organisations(
    id bigserial primary key,
    name varchar(255) not null,
    slug varchar(25) not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by bigint not null references users(id)
);

create type org_role as enum ('admin','lead','member');

create table memberships(
    org_id bigint not null references organisations(id) on delete cascade,
    user_id bigint not null references users(id) on delete cascade,
    role org_role not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key(org_id,user_id)
);

create table workspaces(
    id bigserial primary key,
    org_id bigint not null references organisations(id) on delete cascade,
    name varchar(255) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by bigint not null references users(id),

    unique(org_id, name)
);

create table documents(
    id bigserial primary key,
    workspace_id bigint not null references workspaces(id) on delete cascade,
    parent_id bigint references documents(id) on delete cascade,
    name varchar(255) not null,
    title varchar(255) not null,
    content text not null,
    created_by bigint not null references users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique(workspace_id, parent_id, name)
);