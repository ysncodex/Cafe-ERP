import { Truck } from 'lucide-react';
import { ComingSoon } from '@/shared/components/ui/ComingSoon';

export default function Suppliers() {
  return (
    <ComingSoon
      icon={Truck}
      title="Suppliers"
      description="Manage supplier contacts, purchase orders, and delivery schedules."
      accentColor="cyan"
    />
  );
}
