import { Wallet } from 'lucide-react';
import { ComingSoon } from '@/shared/components/ui/ComingSoon';

export default function FundManagement() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Fund Management"
      description="Track reserve fund transfers, owner investments, and liquidity movements in one place."
      accentColor="indigo"
    />
  );
}
