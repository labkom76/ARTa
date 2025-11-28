import React from 'react';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
}

// Custom comparison function untuk React.memo
const areEqual = (prevProps: SearchInputProps, nextProps: SearchInputProps) => {
    return prevProps.value === nextProps.value &&
        prevProps.placeholder === nextProps.placeholder;
};

// Memoized search input to prevent losing focus during re-renders
const SearchInputComponent = ({ value, onChange, placeholder, inputRef }: SearchInputProps) => {
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <div className="relative w-full sm:min-w-[320px] sm:max-w-[400px]">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder || "Cari..."}
                className="pl-9 w-full focus-visible:ring-emerald-500"
                value={value}
                onChange={handleChange}
            />
        </div>
    );
};

export const SearchInput = React.memo(SearchInputComponent, areEqual);

SearchInput.displayName = 'SearchInput';