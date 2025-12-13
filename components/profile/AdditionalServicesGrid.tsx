'use client';

import { Zap, Banana, Car, Wallet, Shield, Droplet } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  buttonText: string;
  buttonColor: 'blue' | 'red' | 'gray';
}

/**
 * AdditionalServicesGrid Component
 * Grid of additional service tiles
 */
export default function AdditionalServicesGrid() {
  const services: Service[] = [
    { id: 'skuter', name: 'Skuter wodny', icon: Zap, active: true, buttonText: 'domów', buttonColor: 'blue' },
    { id: 'banan', name: 'Banan wodny', icon: Banana, active: false, buttonText: 'domów', buttonColor: 'blue' },
    { id: 'quady', name: 'Quady', icon: Car, active: false, buttonText: 'domów', buttonColor: 'blue' },
    { id: 'kieszonkowe', name: 'Kieszonkowe', icon: Wallet, active: true, buttonText: 'zarządzaj', buttonColor: 'red' },
    { id: 'tarcza', name: 'Tarcza', icon: Shield, active: true, buttonText: 'domów', buttonColor: 'blue' },
    { id: 'oaza', name: 'Oaza', icon: Droplet, active: false, buttonText: 'domów', buttonColor: 'blue' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
      {services.map((service) => {
        const Icon = service.icon;
        const isKieszonkowe = service.id === 'kieszonkowe';

        return (
          <div
            key={service.id}
            className={`
              p-2 sm:p-3 md:p-4 rounded-lg border-2 flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3
              ${service.active
                ? isKieszonkowe
                  ? 'bg-[#EAF6FE] border-[#03adf0]'
                  : 'bg-white border-[#03adf0]'
                : 'bg-gray-50 border-gray-200'
              }
            `}
          >
            <Icon
              className={`
                w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8
                ${service.active ? 'text-[#03adf0]' : 'text-gray-400'}
              `}
            />
            <span className={`text-[10px] sm:text-xs text-center ${service.active ? 'text-gray-900' : 'text-gray-500'}`}>
              {service.name}
            </span>
            <button
              className={`
                px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-colors w-full
                ${service.buttonColor === 'red'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : service.buttonColor === 'blue'
                  ? 'bg-[#03adf0] text-white hover:bg-[#0288c7]'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }
              `}
            >
              {service.buttonText}
            </button>
          </div>
        );
      })}
    </div>
  );
}

