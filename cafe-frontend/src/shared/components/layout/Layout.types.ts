export interface HeaderProps {
  activeTab: TabId;
  onMobileMenuToggle: () => void;
}

export interface SidebarProps {
  activeTab: TabId;
  isOpen: boolean;
  onClose: () => void;
}

export type TabId = 'dashboard' | 'daily_record' | 'daily_expense' | 'product_cost' | 'fixed_cost' | 'fund' | 'report';
