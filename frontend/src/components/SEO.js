import Head from 'next/head'

const SEO = ({
  title = "DrX Consult - Online Pharmacy Consultation & Medical Counseling",
  description = "Get expert pharmaceutical counseling from certified pharmacists. Book online consultations, prescription reviews, and personalized medication guidance. 24/7 healthcare support available.",
  keywords = "online pharmacy consultation, pharmacist counseling, prescription review, medication guidance, healthcare consultation, medical advice, pharmacy services, drug interaction check, medication management, online pharmacist",
  image = "/og-image.jpg",
  url = "",
  type = "website",
  author = "DrX Consult",
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  noindex = false,
  canonical
}) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://drxconsult.in/'
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl
  const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`
  
  // Structured data for healthcare organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "name": "DrX Consult",
    "description": description,
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-XXXXXXXXXX",
      "contactType": "customer service",
      "availableLanguage": ["English", "Hindi"]
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN"
    },
    "medicalSpecialty": [
      "Pharmacy",
      "Clinical Pharmacy",
      "Pharmaceutical Care",
      "Medication Therapy Management"
    ],
    "serviceType": [
      "Online Pharmacy Consultation",
      "Prescription Review",
      "Medication Counseling",
      "Drug Interaction Checking"
    ]
  }

  // Structured data for medical services
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "name": "DrX Consult",
    "description": "Professional online pharmacy consultation and medication counseling services",
    "url": siteUrl,
    "priceRange": "₹149-₹449",
    "paymentAccepted": ["Cash", "Credit Card", "UPI", "Net Banking"],
    "currenciesAccepted": "INR",
    "openingHours": "Mo-Su 00:00-23:59",
    "telephone": "+91-XXXXXXXXXX",
    "email": "drxcall.counselling@gmail.com",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Pharmacy Consultation Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Prescription Review",
            "description": "Expert review of your prescriptions and medications"
          },
          "price": "200",
          "priceCurrency": "INR"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Full Consultation",
            "description": "Comprehensive pharmaceutical consultation and counseling"
          },
          "price": "500",
          "priceCurrency": "INR"
        }
      ]
    }
  }

  // FAQ Schema for common questions
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is online pharmacy consultation?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Online pharmacy consultation is a service where certified pharmacists provide professional advice about medications, drug interactions, side effects, and proper usage through digital platforms."
        }
      },
      {
        "@type": "Question",
        "name": "How much does a consultation cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We offer prescription review for ₹149 and comprehensive consultation for ₹449. All consultations are conducted by certified pharmacists."
        }
      },
      {
        "@type": "Question",
        "name": "Are the pharmacists certified?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all our pharmacists are licensed professionals with proper certifications and extensive experience in pharmaceutical care."
        }
      },
      {
        "@type": "Question",
        "name": "Is my health information secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. We follow strict privacy protocols and use secure encryption to protect all patient health information and personal data."
        }
      }
    ]
  }

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow"} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical || fullUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content="DrX Consult" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content="@drxconsult" />
      <meta name="twitter:creator" content="@drxconsult" />
      
      {/* Article specific meta tags */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {tags.length > 0 && tags.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      
      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#2563eb" />
      <meta name="msapplication-TileColor" content="#2563eb" />
      <meta name="application-name" content="DrX Consult" />
      <meta name="apple-mobile-web-app-title" content="DrX Consult" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />
      
      {/* Geo Meta Tags for Local SEO */}
      <meta name="geo.region" content="IN" />
      <meta name="geo.country" content="India" />
      <meta name="ICBM" content="28.6139, 77.2090" />
      <meta name="geo.position" content="28.6139;77.2090" />
      
      {/* Healthcare specific meta tags */}
      <meta name="medical-disclaimer" content="This service provides pharmaceutical consultation and should not replace professional medical diagnosis or treatment." />
      <meta name="health-topics" content="pharmacy, medication, prescription, drug interaction, pharmaceutical care" />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link rel="preconnect" href="https://ui-avatars.com" />
      
      {/* Favicon and Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
    </Head>
  )
}

export default SEO
