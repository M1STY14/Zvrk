type Props = {
    className?: string;
};

export default function PlayerConnectionBadge({ className = '' }: Props) {
    return (
        <span
            className={`shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ${className}`}
        >
            Odspojen
        </span>
    );
}
