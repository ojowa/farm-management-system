let toastContainer: HTMLDivElement | null = null;

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function showToast(message: string, type: 'error' | 'success' | 'info' = 'error') {
  const container = getContainer();
  const el = document.createElement('div');
  const colors = {
    error: 'bg-red-600 text-white',
    success: 'bg-green-600 text-white',
    info: 'bg-blue-600 text-white',
  };
  el.className = `px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${colors[type]} flex items-center gap-2 min-w-[280px] animate-slide-in`;
  el.innerHTML = `
    <span class="flex-1">${message}</span>
    <button class="ml-2 opacity-80 hover:opacity-100" onclick="this.parentElement.remove()">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

export function toastError(message?: string) {
  showToast(message || 'An unexpected error occurred. Please try again.');
}

export function toastSuccess(message: string) {
  showToast(message, 'success');
}

export function toastInfo(message: string) {
  showToast(message, 'info');
}

export function getErrorMessage(err: any): string {
  return err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
}
