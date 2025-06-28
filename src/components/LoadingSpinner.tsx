import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  variant?: 'default' | 'pulse' | 'dots' | 'wave';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message,
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} relative`}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-accent-500 rounded-full animate-ping opacity-75" />
            <div className="relative bg-gradient-to-r from-primary-500 to-accent-600 rounded-full h-full w-full animate-pulse" />
          </div>
        );
      
      case 'dots':
        return (
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-6 h-6'} bg-gradient-to-r from-primary-400 to-accent-500 rounded-full animate-bounce`}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );
      
      case 'wave':
        return (
          <div className="flex items-end space-x-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`bg-gradient-to-t from-primary-500 to-accent-500 ${
                  size === 'sm' ? 'w-1 h-4' : size === 'md' ? 'w-1.5 h-6' : size === 'lg' ? 'w-2 h-8' : 'w-3 h-12'
                } rounded-full animate-pulse`}
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );
      
      default:
        return (
          <div className="relative">
            <div className={`${sizeClasses[size]} animate-spin`}>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 border-r-accent-500 shadow-glow" />
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-primary-300 border-r-accent-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-lg animate-pulse" />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        {renderSpinner()}
      </div>
      
      {message && (
        <div className="text-center max-w-xs">
          <p className="text-slate-300 text-sm font-medium animate-pulse">
            {message}
          </p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full animate-shimmer" style={{ width: '40%' }} />
          </div>
        </div>
      )}
      
      {/* Ambient light effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
};

export default LoadingSpinner;