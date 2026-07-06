import Modal from "./Modal";

export default function ConfirmModal({ open, onClose, title = "Confirm", message, onConfirm, confirmText = "Delete", confirmLoading }) {
    return (
        <Modal open={open} onClose={onClose} title={title} onConfirm={onConfirm} confirmText={confirmText} confirmLoading={confirmLoading}>
            <p className="text-sm text-muted-foreground">{message}</p>
        </Modal>
    );
}
