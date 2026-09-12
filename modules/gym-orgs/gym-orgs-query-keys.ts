/**
 * Query-key factory for gym-org reads used on Admin surfaces (ADR-0011).
 *
 * Trainers get their own key rather than riding along in the roster payload,
 * unlike the joins on the renewals and attendance desks. The reason is
 * mutation, not size: the roster's optimistic writes map over a plain
 * `RosterMember[]`, and nesting a second list inside that entry would make
 * every check-in block rewrite a list it never touches. Trainers are also
 * mutated by neither screen.
 */
export const gymOrgsKeys = {
    all: ['gym-orgs'] as const,
    trainers: () => [...gymOrgsKeys.all, 'trainers'] as const,
};
