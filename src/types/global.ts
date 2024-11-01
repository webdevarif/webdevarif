export interface MenuItemNode {
  ID: string;
  url: string;
  title: string | null;
  menu_item_parent: string;
  children: MenuItemNode[]; 
}

export interface SiteIdentityProps {
  logo: string;
  favicon: string;
  siteTitle: string;
  tagLine: string;
}

export interface GlobalSettingsProps {
  identity?: SiteIdentityProps;
  menu?: MenuItemNode[];
  styleCss?: string | null | undefined;
}



export interface PostTagProps {
  term_id?:  number;
  name: string;
  slug: string;
  term_group?:  number;
  term_taxonomy_id?:  number;
  taxonomy: string | null;
  description?: string | null;
  parent?:  number;
  count?:  number;
  filter?: string | null;
}



export interface PostCategoryProps {
  term_id?:  number;
  name: string;
  slug: string;
  term_group?: number;
  term_taxonomy_id:  number;
  taxonomy: string | null;
  description?: string;
  parent?:  number;
  count?:  number;
  filter?: string | null;
  cat_ID?:  number;
  category_count?:  number;
  category_description?: string | null;
  cat_name?: string | null;
  category_nicename?: string | null;
  category_parent?:  number;
}