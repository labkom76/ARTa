// Bank brand color mapping
// Colors are based on official bank branding

interface BankColor {
    bg: string;
    text: string;
    border: string;
}

const BANK_COLORS: Record<string, BankColor> = {
    'SulutGo (BSG)': {
        bg: 'bg-[#8B1538]/10 dark:bg-[#FF6B9D]/10',
        text: 'text-[#8B1538] dark:text-[#FF6B9D]',
        border: 'border-[#8B1538]/20 dark:border-[#FF6B9D]/30',
    },
    'BRI': {
        bg: 'bg-[#003D79]/10 dark:bg-[#4A90E2]/10',
        text: 'text-[#003D79] dark:text-[#4A90E2]',
        border: 'border-[#003D79]/20 dark:border-[#4A90E2]/30',
    },
    'BNI': {
        bg: 'bg-[#F37021]/10 dark:bg-[#FF9A56]/10',
        text: 'text-[#F37021] dark:text-[#FF9A56]',
        border: 'border-[#F37021]/20 dark:border-[#FF9A56]/30',
    },
    'Mandiri': {
        bg: 'bg-[#003D79]/10 dark:bg-[#4A90E2]/10',
        text: 'text-[#003D79] dark:text-[#4A90E2]',
        border: 'border-[#003D79]/20 dark:border-[#4A90E2]/30',
    },
    'Mandiri Taspen': {
        bg: 'bg-[#003D79]/10 dark:bg-[#4A90E2]/10',
        text: 'text-[#003D79] dark:text-[#4A90E2]',
        border: 'border-[#003D79]/20 dark:border-[#4A90E2]/30',
    },
    'Tabungan Negara (BTN)': {
        bg: 'bg-[#00A651]/10 dark:bg-[#4ADE80]/10',
        text: 'text-[#00A651] dark:text-[#4ADE80]',
        border: 'border-[#00A651]/20 dark:border-[#4ADE80]/30',
    },
    'Syariah Indonesia (BSI)': {
        bg: 'bg-[#00A79D]/10 dark:bg-[#5EEAD4]/10',
        text: 'text-[#00A79D] dark:text-[#5EEAD4]',
        border: 'border-[#00A79D]/20 dark:border-[#5EEAD4]/30',
    },
    'Permata': {
        bg: 'bg-[#E31E24]/10 dark:bg-[#F87171]/10',
        text: 'text-[#E31E24] dark:text-[#F87171]',
        border: 'border-[#E31E24]/20 dark:border-[#F87171]/30',
    },
    'OCBC NISP': {
        bg: 'bg-[#ED1C24]/10 dark:bg-[#F87171]/10',
        text: 'text-[#ED1C24] dark:text-[#F87171]',
        border: 'border-[#ED1C24]/20 dark:border-[#F87171]/30',
    },
    'Panin': {
        bg: 'bg-[#003DA5]/10 dark:bg-[#60A5FA]/10',
        text: 'text-[#003DA5] dark:text-[#60A5FA]',
        border: 'border-[#003DA5]/20 dark:border-[#60A5FA]/30',
    },
    'Mega': {
        bg: 'bg-[#0066B3]/10 dark:bg-[#60A5FA]/10',
        text: 'text-[#0066B3] dark:text-[#60A5FA]',
        border: 'border-[#0066B3]/20 dark:border-[#60A5FA]/30',
    },
    'Sinarmas': {
        bg: 'bg-[#FFB81C]/10 dark:bg-[#FCD34D]/10',
        text: 'text-[#FFB81C] dark:text-[#FCD34D]',
        border: 'border-[#FFB81C]/20 dark:border-[#FCD34D]/30',
    },
};

// Default color for banks not in the mapping
const DEFAULT_COLOR: BankColor = {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
};

export function getBankColor(bankName: string | null | undefined): BankColor {
    if (!bankName) return DEFAULT_COLOR;
    return BANK_COLORS[bankName] || DEFAULT_COLOR;
}
