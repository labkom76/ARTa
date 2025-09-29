import React from 'react';

interface KoreksiTagihanSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  tagihanId: string | null;
}

const KoreksiTagihanSidePanel: React.FC<KoreksiTagihanSidePanelProps> = ({ isOpen, onClose, tagihanId }) => {
  if (!isOpen || !tagihanId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="bg-white dark:bg-gray-800 w-full md:w-1/3 lg:w-1/4 h-full shadow-lg overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Koreksi Tagihan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            &times;
          </button>
        </div>
        <div className="p-4">
          {/* Konten panel koreksi akan ditambahkan di sini */}
          <p className="text-gray-600 dark:text-gray-300">Panel koreksi untuk tagihan ID: {tagihanId}</p>
        </div>
      </div>
    </div>
  );
};

export default KoreksiTagihanSidePanel;