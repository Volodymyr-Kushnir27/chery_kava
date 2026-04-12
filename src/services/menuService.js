import { supabase } from "../lib/supabase";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || "").trim());
}

function normalizePrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num;
}

function formatPriceLabel(value) {
  const num = normalizePrice(value);

  if (Number.isInteger(num)) {
    return `${num} грн`;
  }

  return `${num.toFixed(2)} грн`;
}

function mapRowsToMenu(rows = []) {
  const categoriesMap = new Map();

  for (const row of rows) {
    const categoryId = row.category_id;
    const itemId = row.item_id;

    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        id: row.category_id,
        slug: row.category_slug,
        title: row.category_title,
        subtitle: row.category_subtitle,
        sort_order: row.category_sort_order ?? 0,
        itemsMap: new Map(),
      });
    }

    const category = categoriesMap.get(categoryId);

    if (!category.itemsMap.has(itemId)) {
      category.itemsMap.set(itemId, {
        id: row.item_id,
        slug: row.item_slug,
        title: row.item_title,
        description: row.item_description,
        ingredients: row.item_ingredients,
        sort_order: row.item_sort_order ?? 0,
        sizes: [],
      });
    }

    const item = category.itemsMap.get(itemId);

    item.sizes.push({
      id: row.size_id,
      code: row.size_code,
      label: row.size_label,
      volume_ml: row.volume_ml,
      price: normalizePrice(row.price),
      priceLabel: formatPriceLabel(row.price),
      is_available: !!row.is_available,
      sort_order: row.size_sort_order ?? 0,
      location_price_id: row.location_price_id,
    });
  }

  const categories = Array.from(categoriesMap.values())
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => {
      const items = Array.from(category.itemsMap.values())
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          ...item,
          sizes: [...item.sizes].sort((a, b) => a.sort_order - b.sort_order),
        }));

      return {
        id: category.id,
        slug: category.slug,
        title: category.title,
        subtitle: category.subtitle,
        sort_order: category.sort_order,
        items,
      };
    });

  return categories;
}

export async function getLocations() {
  const { data, error } = await supabase
    .from("locations")
    .select("id, slug, title, short_title, address, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message || "Не вдалося завантажити локації");
  }

  return data || [];
}

export async function getDefaultLocation() {
  const locations = await getLocations();
  return locations[0] || null;
}

export async function getMenuRowsByLocation(locationIdOrSlug) {
  let query = supabase
    .from("menu_catalog_view")
    .select("*")
    .order("category_sort_order", { ascending: true })
    .order("item_sort_order", { ascending: true })
    .order("size_sort_order", { ascending: true });

  if (isUuid(locationIdOrSlug)) {
    query = query.eq("location_id", locationIdOrSlug);
  } else {
    query = query.eq("location_slug", String(locationIdOrSlug));
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Не вдалося завантажити меню");
  }

  return data || [];
}

export async function getMenuByLocation(locationIdOrSlug) {
  const rows = await getMenuRowsByLocation(locationIdOrSlug);

  if (!rows.length) {
    return {
      location: null,
      categories: [],
      rawRows: [],
    };
  }

  const firstRow = rows[0];

  return {
    location: {
      id: firstRow.location_id,
      slug: firstRow.location_slug,
      title: firstRow.location_title,
      short_title: firstRow.location_short_title,
      address: firstRow.location_address,
      sort_order: firstRow.location_sort_order ?? 0,
    },
    categories: mapRowsToMenu(rows),
    rawRows: rows,
  };
}

export async function getInitialMenuState(preferredLocationSlug = null) {
  const locations = await getLocations();

  if (!locations.length) {
    return {
      locations: [],
      selectedLocation: null,
      categories: [],
    };
  }

  const selectedLocation =
    locations.find((loc) => loc.slug === preferredLocationSlug) || locations[0];

  const menu = await getMenuByLocation(selectedLocation.id);

  return {
    locations,
    selectedLocation,
    categories: menu.categories,
  };
}

export async function refreshMenuForLocation(locationIdOrSlug) {
  const menu = await getMenuByLocation(locationIdOrSlug);

  return {
    selectedLocation: menu.location,
    categories: menu.categories,
  };
}

/**
 * ADMIN METHODS
 * Нижче методи для майбутнього staff/admin UI.
 * Уже можна використовувати для веб-адмінки або staff screen.
 */

export async function createMenuCategory(payload) {
  const { data, error } = await supabase
    .from("menu_categories")
    .insert([
      {
        slug: payload.slug,
        title: payload.title,
        subtitle: payload.subtitle || null,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося створити категорію");
  }

  return data;
}

export async function updateMenuCategory(categoryId, payload) {
  const { data, error } = await supabase
    .from("menu_categories")
    .update({
      slug: payload.slug,
      title: payload.title,
      subtitle: payload.subtitle ?? null,
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося оновити категорію");
  }

  return data;
}

export async function createMenuItem(payload) {
  const { data, error } = await supabase
    .from("menu_items")
    .insert([
      {
        category_id: payload.category_id,
        slug: payload.slug,
        title: payload.title,
        description: payload.description || null,
        ingredients: payload.ingredients || null,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося створити позицію меню");
  }

  return data;
}

export async function updateMenuItem(itemId, payload) {
  const { data, error } = await supabase
    .from("menu_items")
    .update({
      category_id: payload.category_id,
      slug: payload.slug,
      title: payload.title,
      description: payload.description ?? null,
      ingredients: payload.ingredients ?? null,
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося оновити позицію меню");
  }

  return data;
}

export async function createMenuItemSize(payload) {
  const { data, error } = await supabase
    .from("menu_item_sizes")
    .insert([
      {
        item_id: payload.item_id,
        size_code: payload.size_code,
        size_label: payload.size_label,
        volume_ml: payload.volume_ml ?? null,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося створити розмір");
  }

  return data;
}

export async function updateMenuItemSize(sizeId, payload) {
  const { data, error } = await supabase
    .from("menu_item_sizes")
    .update({
      size_code: payload.size_code,
      size_label: payload.size_label,
      volume_ml: payload.volume_ml ?? null,
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .eq("id", sizeId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося оновити розмір");
  }

  return data;
}

export async function upsertLocationMenuPrice(payload) {
  const upsertPayload = {
    location_id: payload.location_id,
    item_size_id: payload.item_size_id,
    price: payload.price,
    is_available: payload.is_available ?? true,
    is_active: payload.is_active ?? true,
    sort_order: payload.sort_order ?? 0,
  };

  const { data, error } = await supabase
    .from("location_menu_prices")
    .upsert([upsertPayload], {
      onConflict: "location_id,item_size_id",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося зберегти ціну для локації");
  }

  return data;
}

export async function setLocationItemAvailability({
  location_id,
  item_size_id,
  is_available,
}) {
  const { data, error } = await supabase
    .from("location_menu_prices")
    .update({
      is_available: !!is_available,
    })
    .eq("location_id", location_id)
    .eq("item_size_id", item_size_id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Не вдалося змінити доступність позиції");
  }

  return data;
}

export async function deleteMenuItem(itemId) {
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(error.message || "Не вдалося видалити позицію");
  }

  return true;
}

export async function deleteMenuCategory(categoryId) {
  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    throw new Error(error.message || "Не вдалося видалити категорію");
  }

  return true;
}