import React from 'react';
import { TransferRequestStatus, TransactionType } from '../../types';
import { getStatusBadgeConfig, getTransactionTypeBadge } from '../../utils/formatters';

interface StatusBadgeProps {
  status: TransferRequestStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const cfg = getStatusBadgeConfig(status);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
};

interface TransactionBadgeProps {
  type: TransactionType;
}

export const TransactionBadge: React.FC<TransactionBadgeProps> = ({ type }) => {
  const cfg = getTransactionTypeBadge(type);
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cfg.bgClass} ${cfg.textClass}`}>
      {cfg.label}
    </span>
  );
};
