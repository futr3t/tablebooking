import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB, enUS } from 'date-fns/locale';
import { useDateFormat } from '../../contexts/DateFormatContext';

interface DynamicLocalizationProviderProps {
  children: React.ReactNode;
}

/**
 * Dynamic LocalizationProvider that switches locale based on restaurant's dateFormat setting
 */
export const DynamicLocalizationProvider: React.FC<DynamicLocalizationProviderProps> = ({ children }) => {
  const { dateFormat } = useDateFormat();
  
  // Select appropriate locale based on dateFormat setting
  const locale = dateFormat === 'us' ? enUS : enGB;
  
  // Debug log to track locale changes
  console.log('DynamicLocalizationProvider: dateFormat =', dateFormat, 'locale =', locale.code);
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      {children}
    </LocalizationProvider>
  );
};

export default DynamicLocalizationProvider;