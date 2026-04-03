import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TelegramModalProps {
	open: boolean;
	onClose: () => void;
	action: string;
}

export function TelegramModal({ open, onClose, action }: TelegramModalProps) {
	const navigate = useNavigate();

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
				}}
				role="button"
				tabIndex={0}
				aria-label="Close modal"
			/>

			{/* Modal */}
			<div className="relative bg-surface-container rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-outline-variant/20">
				{/* Icon */}
				<div className="flex justify-center mb-4">
					<div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
						<span className="material-symbols-outlined text-primary text-3xl">login</span>
					</div>
				</div>

				{/* Title */}
				<h2 className="font-headline text-xl font-bold text-on-surface text-center mb-2">
					Sign In Required
				</h2>

				{/* Description */}
				<p className="text-on-surface-variant text-sm text-center mb-6 leading-relaxed">
					To <span className="text-primary font-medium">{action}</span>, sign in with your phone
					number or Telegram account.
				</p>

				{/* Sign in button */}
				<button
					type="button"
					onClick={() => {
						onClose();
						navigate("/signin");
					}}
					className="w-full py-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
				>
					<span className="material-symbols-outlined text-xl">phone_iphone</span>
					Sign In
				</button>

				{/* Telegram option */}
				<a
					href="https://t.me/fitequb_bot"
					target="_blank"
					rel="noopener noreferrer"
					className="w-full mt-3 py-3.5 rounded-2xl bg-[#0088cc]/10 text-[#0088cc] font-headline font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
				>
					<svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0088cc">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
					</svg>
					Or open in Telegram
				</a>

				{/* Dismiss */}
				<button
					type="button"
					onClick={onClose}
					className="w-full mt-2 py-3 rounded-2xl text-on-surface-variant font-body text-sm active:scale-[0.98] transition-transform"
				>
					Continue Browsing
				</button>
			</div>
		</div>
	);
}

export function useTelegramModal() {
	const [open, setOpen] = useState(false);
	const [action, setAction] = useState("");

	function showModal(actionDesc: string) {
		setAction(actionDesc);
		setOpen(true);
	}

	const modalProps = {
		open,
		action,
		onClose: () => setOpen(false),
	};

	return { showModal, modalProps };
}
