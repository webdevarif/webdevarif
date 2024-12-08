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
  name: string;
  slug: string;
  term_id?:  number;
}

export interface PostCategoryProps {
  name: string;
  slug: string;
  term_id?:  number;
  description?: string;
}