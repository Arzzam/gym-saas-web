export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="animate-pulse space-y-2" aria-hidden="true">
                <div className="h-8 w-36 rounded bg-(--color-border)" />
                <div className="h-4 w-full max-w-md rounded bg-(--color-border)" />
            </div>
            <div className="animate-pulse space-y-3 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)">
                <div className="h-5 w-32 rounded bg-(--color-border)" />
                <div className="h-4 w-full max-w-md rounded bg-(--color-border)" />
            </div>
        </div>
    );
}
