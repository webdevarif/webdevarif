interface MenuJSON {
  id: number;
  title: string;
  slug: string;
  submenu?: {
    title?: string;
    description?: string;
    slug: string
  }[];
  className?: string;
}

const menus: MenuJSON[] = [
  {
    id: 1,
    title: "Home",
    slug: "/",
  }, {
    id: 2,
    title: "About Me",
    slug: "/about-me",
  },{
    id: 3,
    title: "My Services",
    slug: "/services",
    submenu: [
      {
        title: "0-6 Months",
        description: "The 0-6 Months Sleep Series gives you 6 months access to our Newborn and 4-6 Months Sleep Series courses.",
        slug: '/0-6-months',
      }, {
        title: "0-6 Months",
        description: "The 0-6 Months Sleep Series gives you 6 months access to our Newborn and 4-6 Months Sleep Series courses.",
        slug: '/0-6-months',
      }, {
        title: "0-6 Months",
        description: "The 0-6 Months Sleep Series gives you 6 months access to our Newborn and 4-6 Months Sleep Series courses.",
        slug: '/0-6-months',
      }, {
        title: "0-6 Months",
        description: "The 0-6 Months Sleep Series gives you 6 months access to our Newborn and 4-6 Months Sleep Series courses.",
        slug: '/0-6-months',
      }, {
        title: "0-6 Months",
        description: "The 0-6 Months Sleep Series gives you 6 months access to our Newborn and 4-6 Months Sleep Series courses.",
        slug: '/0-6-months',
      }
    ]
  },
  {
    id: 4,
    title: "Projects",
    slug: "/projects",
  },
  {
    id: 5,
    title: "Blogs",
    slug: "/blogs",
  },
  {
    id: 6,
    title: "Contact Me",
    slug: "/contact-me",
  }
];

export { menus };
