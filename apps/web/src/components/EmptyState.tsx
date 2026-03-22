interface EmptyStateProps {
	icon: string;
	title: string;
	subtitle: string;
	ctaLabel?: string;
	onCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-16 px-8 text-center">
			<div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
				<span className="material-symbols-outlined text-on-surface-variant text-3xl">{icon}</span>
			</div>
			<p className="font-headline text-base font-bold text-on-surface mb-2">{title}</p>
			<p className="text-sm text-on-surface-variant mb-6">{subtitle}</p>
			{ctaLabel && onCta && (
				<button
					type="button"
					onClick={onCta}
					className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-sm active:scale-95 transition-transform"
				>
					{ctaLabel}
				</button>
			)}
		</div>
	);
}
