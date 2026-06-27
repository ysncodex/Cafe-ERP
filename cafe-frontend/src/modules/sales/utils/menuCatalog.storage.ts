import { generateId } from '@/shared/utils';
import type { MenuItem, MenuCategory } from '../types/menuItem.types';

const STORAGE_KEY = 'bb_menu_catalog_v1';

// ─── Default Menu (from Beans & Butter menu) ─────────────────────────────────

const DEFAULT_MENU: Omit<MenuItem, 'id'>[] = [
  // Coffee
  { name: 'Americano',                          category: 'Coffee',      price: 150,  available: true },
  { name: 'Cappuccino',                         category: 'Coffee',      price: 210,  available: true },
  { name: 'Espresso (Single)',                  category: 'Coffee',      price: 70,   available: true },
  { name: 'Espresso (Double)',                  category: 'Coffee',      price: 120,  available: true },
  { name: 'Hazelnut Latte',                     category: 'Coffee',      price: 260,  available: true },
  { name: 'Hot Chocolate',                      category: 'Coffee',      price: 110,  available: true },
  { name: 'Hot Mocha',                          category: 'Coffee',      price: 190,  available: true },

  // Iced Coffee
  { name: 'Iced Blended Cookies Mocha',         category: 'Iced Coffee', price: 310,  available: true },
  { name: 'Iced Shaken Hazelnut Espresso',      category: 'Iced Coffee', price: 350,  available: true },
  { name: 'Iced Spanish Latte',                 category: 'Iced Coffee', price: 290,  available: true },

  // Milk Tea
  { name: 'Chocolate Milk Tea with Boba',       category: 'Milk Tea',    price: 250,  available: true },
  { name: 'Chocolate Milk Tea with Ice Cream',  category: 'Milk Tea',    price: 310,  available: true },
  { name: 'Hazelnut Milk Tea with Boba',        category: 'Milk Tea',    price: 270,  available: true },
  { name: 'Hazelnut Milk Tea with Ice Cream',   category: 'Milk Tea',    price: 330,  available: true },
  { name: 'Ice Mango Tea with Boba (No Milk)',  category: 'Milk Tea',    price: 150,  available: true },
  { name: 'Mango Milk Tea with Boba',           category: 'Milk Tea',    price: 250,  available: true },
  { name: 'Mango Milk Tea with Ice Cream',      category: 'Milk Tea',    price: 310,  available: true },

  // Mocktails
  { name: 'Apple Fizz',                         category: 'Mocktails',   price: 170,  available: true },
  { name: 'Blue Lagoon Mojito',                 category: 'Mocktails',   price: 130,  available: true },
  { name: 'Boozy Blueberry',                    category: 'Mocktails',   price: 170,  available: true },
  { name: 'Mango Carnival',                     category: 'Mocktails',   price: 140,  available: true },
  { name: 'Orange Glo',                         category: 'Mocktails',   price: 170,  available: true },
  { name: 'Virgin Mojito',                      category: 'Mocktails',   price: 100,  available: true },

  // Affogato
  { name: 'Boba Affogato',                      category: 'Affogato',    price: 240,  available: true },
  { name: 'Hazelnut Affogato',                  category: 'Affogato',    price: 200,  available: true },
  { name: 'Oreo Affogato',                      category: 'Affogato',    price: 180,  available: true },

  // Shakes
  { name: 'Chocolate Shake',                    category: 'Shakes',      price: 170,  available: true },
  { name: 'Mango Chocolate Shake (Boba Added)', category: 'Shakes',      price: 250,  available: true },
  { name: 'Mango Shake',                        category: 'Shakes',      price: 200,  available: true },
  { name: 'Mango Strawberry Shake (Boba Added)',category: 'Shakes',      price: 250,  available: true },
  { name: 'Oreo KitKat Shake',                  category: 'Shakes',      price: 240,  available: true },
  { name: 'Strawberry Shake',                   category: 'Shakes',      price: 220,  available: true },

  // Waffle Menu
  { name: 'Banana Mango Wrapper',               category: 'Waffle Menu', price: 220,  available: true },
  { name: 'Choco Waffle',                       category: 'Waffle Menu', price: 120,  available: true },
  { name: 'KitKat Carnival',                    category: 'Waffle Menu', price: 210,  available: true },
  { name: 'Nutella Overload with Ice Cream',    category: 'Waffle Menu', price: 170,  available: true },
  { name: 'Oreo Choco Waffle',                  category: 'Waffle Menu', price: 210,  available: true },
  { name: 'Strawberry Nutella Waffle',          category: 'Waffle Menu', price: 220,  available: true },
  { name: 'Triple Choco Bliss',                 category: 'Waffle Menu', price: 200,  available: true },
  { name: 'Tropical Mango Drizzle',             category: 'Waffle Menu', price: 200,  available: true },
  { name: 'Vanilla Dessert',                    category: 'Waffle Menu', price: 250,  available: true },
  { name: 'Whippy Chocolate Waffle',            category: 'Waffle Menu', price: 180,  available: true },
  { name: 'White Mango Wrapper',                category: 'Waffle Menu', price: 200,  available: true },
  { name: 'White Waffle',                       category: 'Waffle Menu', price: 130,  available: true },

  // Chicken
  { name: 'Cheesy Egg Sausage Combo',           category: 'Chicken',     price: 180,  available: true },
  { name: 'Chicken Crunch Sandwich',            category: 'Chicken',     price: 260,  available: true },
  { name: 'Chicken Duo Sandwich',               category: 'Chicken',     price: 240,  available: true },
  { name: 'Sausage Bowl',                       category: 'Chicken',     price: 250,  available: true },

  // Pasta
  { name: 'Creamy Garlic Fettuccine',           category: 'Pasta',       price: 320,  available: true },
  { name: 'Creamy Garlic Fettuccine with Chicken', category: 'Pasta',    price: 400,  available: true },
  { name: 'Spicy Peri Peri Pasta',              category: 'Pasta',       price: 350,  available: true },

  // Sides
  { name: 'Peri Peri Potato Wedges',            category: 'Sides',       price: 120,  available: true },
  { name: 'Spicy Street Fries',                 category: 'Sides',       price: 110,  available: true },

  // Add On
  { name: 'Extra Baba',                         category: 'Add On',      price: 90,   available: true },
  { name: 'Extra Nutella',                      category: 'Add On',      price: 55,   available: true },
  { name: 'Extra Nuts',                         category: 'Add On',      price: 35,   available: true },
  { name: 'Ice Cream',                          category: 'Add On',      price: 60,   available: true },
];

// ─── Storage helpers ─────────────────────────────────────────────────────────

export function loadMenuCatalog(): MenuItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MenuItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seedDefaultMenu();
}

export function saveMenuCatalog(items: MenuItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function seedDefaultMenu(): MenuItem[] {
  const seeded: MenuItem[] = DEFAULT_MENU.map((item) => ({
    ...item,
    id: generateId(),
  }));
  saveMenuCatalog(seeded);
  return seeded;
}

export function addMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
  const catalog = loadMenuCatalog();
  const newItem: MenuItem = { ...item, id: generateId() };
  saveMenuCatalog([...catalog, newItem]);
  return newItem;
}

export function updateMenuItem(updated: MenuItem): void {
  const catalog = loadMenuCatalog();
  saveMenuCatalog(catalog.map((i) => (i.id === updated.id ? updated : i)));
}

export function deleteMenuItem(id: string): void {
  const catalog = loadMenuCatalog();
  saveMenuCatalog(catalog.filter((i) => i.id !== id));
}

export function toggleMenuItemAvailability(id: string): void {
  const catalog = loadMenuCatalog();
  saveMenuCatalog(
    catalog.map((i) => (i.id === id ? { ...i, available: !i.available } : i)),
  );
}

export function getMenuByCategory(category: MenuCategory): MenuItem[] {
  return loadMenuCatalog().filter((i) => i.category === category && i.available);
}

export function getAvailableMenu(): MenuItem[] {
  return loadMenuCatalog().filter((i) => i.available);
}

export { DEFAULT_MENU };
