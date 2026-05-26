type Props = {
    show: boolean;
    /** Defaults to single-opponent copy; use plural for 3+ player games. */
    multiple?: boolean;
};

export default function OpponentDisconnectedBanner({ show, multiple = false }: Props) {
    if (!show) {
        return null;
    }

    return (
        <div
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
            role="status"
        >
            {multiple
                ? 'Jedan ili više igrača je privremeno odspojeno. Čekamo ponovno spajanje…'
                : 'Protivnik je privremeno odspojen. Čekamo ponovno spajanje…'}
        </div>
    );
}
