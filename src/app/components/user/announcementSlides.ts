import type { AnnouncementSlide } from './ImageAnnouncementBar';

export const HEADER_NEWS_SLIDES: AnnouncementSlide[] = [
  {
    image:
      'https://images.ctfassets.net/ao7gxs2zk32d/69lb8HoCssCzMlE1T2LkVi/8f679839b5cd471ce47b9db67734f78d/Mobile_Chime_Card_Phone_Transition_Black_250917-1.webp',
    text: 'Card controls are now faster and easier in your dashboard.',
    link: '/dashboard/cards',
  },
  {
    image: 'https://assets.bitdegree.org/images/how-to-transfer-money-from-chime-to-bank-account-intro.jpg',
    text: 'Move funds to any supported bank account in a few taps.',
    link: '/dashboard/withdraw',
  },
  {
    image: 'https://mir-s3-cdn-cf.behance.net/projects/original/d0b55e195794131.Y3JvcCwxODM1LDE0MzYsMzU5LDA.png',
    text: 'Track your account activity with full receipt details.',
    link: '/activity',
  },
  {
    image:
      'https://media.licdn.com/dms/image/v2/D4E22AQE6BxPDjfkjkw/feedshare-shrink_800/B4EZrqtMU1KgAk-/0/1764874307855?e=2147483647&v=beta&t=rsjrfsP-KoyTNTWGNQz-uz_AWF5abuixUywhw8rYiNY',
    text: 'Daily alerts keep you informed on every balance change.',
    link: '/activity',
  },
];

export const PROMOTION_SLIDES: AnnouncementSlide[] = [
  {
    image:
      'https://media.licdn.com/dms/image/v2/C5622AQHEVpEJldJcAQ/feedshare-shrink_800/feedshare-shrink_800/0/1655355865182?e=2147483647&v=beta&t=lHrULjNLSunXi3MdYlKziLChuJNbjKSzSRtkcjspeqQ',
    text: 'Explore smart ways to save with your account goals.',
    link: '/savings',
  },
  {
    image: 'https://www.medialogic.com/wp-content/uploads/2021/02/FS-chime-bank-21021-blog11.jpg',
    text: 'Get instant support from customer care whenever you need help.',
    link: '/chat',
  },
  {
    image: 'https://cdn.prod.website-files.com/67853eb4b679ea06a39ed516/680f8560a191af4fa5a63b4d_Chime_3.jpg',
    text: 'Monitor your cards and spending insights in one place.',
    link: '/dashboard/cards',
  },
  {
    image:
      'https://images.ctfassets.net/ao7gxs2zk32d/7sfYpZOTLBRJWhfxOQShZS/fd039c67f9b49d507e602e766124bb8e/hp-redeisgn-Open-graph.webp',
    text: 'Stay secure with real-time account alerts and tracking.',
    link: '/activity',
  },
];

export const FLOW_ANNOUNCEMENT_SLIDES: AnnouncementSlide[] = [
  ...HEADER_NEWS_SLIDES,
  ...PROMOTION_SLIDES,
];
