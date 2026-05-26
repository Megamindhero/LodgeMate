import './globals.css';

export const metadata = {
  metadataBase: new URL('https://lodgemate.ng'),
  title: {
    default: 'LodgeMate — Find Verified Apartments in Minna, Niger State',
    template: '%s | LodgeMate Minna',
  },
  description:
    'LodgeMate is Minna\'s trusted property platform. Find verified apartments and flats in Gidan-Kwano, Gidan-Mango, Kpakungun and Gurara. No fake agents. No hidden fees. Real landlords, real homes.',
  keywords: [
    'house for rent in Minna',
    'apartments in Minna Niger State',
    'flat to rent Minna',
    'Gidan Kwano house for rent',
    'Gidan Mango apartment',
    'Kpakungun flat',
    'Gurara house rent',
    'lodgemate',
    'lodgemate.ng',
    'property Minna',
    'rent house Minna',
    'verified apartments Nigeria',
    'no agent fee Minna',
    'student accommodation Minna',
    'FUTMINNA accommodation',
  ],
  authors: [{ name: 'LodgeMate', url: 'https://lodgemate.ng' }],
  creator: 'LodgeMate',
  publisher: 'LodgeMate',
  category: 'Real Estate',
  classification: 'Property Listings',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://lodgemate.ng',
    siteName: 'LodgeMate',
    title: 'LodgeMate — Verified Apartments in Minna, Niger State',
    description:
      'Find your next home in Minna with zero fake agents. Browse verified listings in Gidan-Kwano, Gidan-Mango, Kpakungun and Gurara. Chat with LodgeMate support and pay directly to the landlord.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LodgeMate — Find Verified Apartments in Minna',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LodgeMate — Verified Apartments in Minna',
    description:
      'No fake agents. No hidden fees. Find verified homes in Minna, Niger State on lodgemate.ng',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'QJq8fESgiXmV0AU62-XCwr1L43j_8fKxrrtxffjH8zM',
  },
  alternates: {
    canonical: 'https://lodgemate.ng',
  },
};

// Structured data for Google — tells Google exactly what this site is about
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'RealEstateAgent',
      '@id': 'https://lodgemate.ng',
      name: 'LodgeMate',
      url: 'https://lodgemate.ng',
      description:
        'LodgeMate is a verified property management and listing platform in Minna, Niger State, Nigeria. We connect tenants with verified landlords across Gidan-Kwano, Gidan-Mango, Kpakungun and Gurara.',
      areaServed: {
        '@type': 'City',
        name: 'Minna',
        containedInPlace: {
          '@type': 'State',
          name: 'Niger State',
          containedInPlace: {
            '@type': 'Country',
            name: 'Nigeria',
          },
        },
      },
      serviceType: 'Property Rental Management',
      hasMap: 'https://maps.google.com/?q=Minna,Niger+State,Nigeria',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://lodgemate.ng/#website',
      url: 'https://lodgemate.ng',
      name: 'LodgeMate',
      description: 'Verified apartment listings in Minna, Niger State',
      publisher: { '@id': 'https://lodgemate.ng' },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://lodgemate.ng/?search={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>" />
        <meta name="geo.region" content="NG-NI" />
        <meta name="geo.placename" content="Minna, Niger State" />
        <meta name="geo.position" content="9.6139;6.5569" />
        <meta name="ICBM" content="9.6139, 6.5569" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
