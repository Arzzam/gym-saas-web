export type GrantAware<T> = { status: 'ok'; data: T } | { status: 'not_shared' };
