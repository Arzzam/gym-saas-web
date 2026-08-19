/**
 * The panel-level "something went wrong" banner.
 *
 * Five Admin panels had grown their own copy of this markup, and they had
 * already drifted: two used `rounded-md` — a radius that is not in the scale at
 * all (`docs/ui-design-system.md` §1) — while three used `--radius-control`.
 *
 * This is only for a **panel-level** failure, where an action or a list did not
 * work. An invalid field inside a form stays an inline `<p>` next to the input
 * it belongs to: moving it up here would separate the message from the control
 * that caused it.
 *
 * Renders nothing when there is no message, so callers can pass a possibly-null
 * error without guarding at every site.
 */
export function ErrorNotice({ message }: { message: string | null | undefined }) {
    if (!message) {
        return null;
    }

    return (
        <p
            role="alert"
            className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-danger)"
        >
            {message}
        </p>
    );
}
