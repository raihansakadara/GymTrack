import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, onConfirm, confirmText = "Save", confirmLoading }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
             onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-background w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-5 space-y-5">
                    {children}
                </div>
                <div className="flex justify-end gap-2 p-5 border-t border-border">
                    <button
                        onClick={onClose}
                        className="border border-border bg-transparent text-foreground hover:bg-muted px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={confirmLoading}
                        className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50"
                    >
                        {confirmLoading ? "Saving…" : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
