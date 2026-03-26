import Head from 'next/head'

const SEO = ({
  title = "DrX Consult - Online Healthcare Consultation Platform",
  description = "Connect with certified doctors, pharmacists, and dietitians for comprehensive healthcare guidance. Women's Care, Chronic Care, and Fat to Fit subscription plans available.",
  keywords = "online doctor consultation, pharmacist counseling, dietitian consultation, women's care, chronic care, weight management, prescription review, medication guidance, healthcare platform India, online doctor consultancy, doctors near me, online doctors near me, apollo pharmacy, medplus mart, cardiologist near me, how to reduce sugar, bp problem, sexologist, weight management, how to become fit in 10 days, how to become fit to impress girl",
  image = "/og-image.jpg",
  url = "",
  type = "website",
  noindex = false,
  canonical
}) => {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://drxconsult.in' || 'https://drxconsult.com').replace(/\/$/, '')
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl
  const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "name": "DrX Consult",
    "description": "Comprehensive online healthcare consultation platform with doctors, pharmacists, and dietitians.",
    "url": siteUrl,
    "logo": `${siteUrl}/favicon-32x32.png`,
    "email": "drxcall.counselling@gmail.com",
    "address": { "@type": "PostalAddress", "addressCountry": "IN" },
    "medicalSpecialty": ["Pharmacy", "General Practice", "Nutrition", "Women's Health"],
    "serviceType": [
      "Online Doctor Consultation",
      "Pharmacist Counseling",
      "Dietitian Consultation",
      "Women's Care Plan",
      "Chronic Disease Management",
      "Weight Management"
    ]
  }

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "name": "DrX Consult",
    "url": siteUrl,
    "priceRange": "₹12,999 - ₹75,999",
    "paymentAccepted": ["Credit Card", "UPI", "Net Banking"],
    "currenciesAccepted": "INR",
    "openingHours": "Mo-Su 00:00-23:59",
    "email": "drxcall.counselling@gmail.com",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Healthcare Subscription Plans",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Women's Care Plan",
            "description": "1-to-1 gynaecologist, dietician, yoga, period & PCOS care, hair & skin care"
          },
          "price": "13999",
          "priceCurrency": "INR"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Chronic Care Plan",
            "description": "Doctor consultation, BP/diabetes/thyroid management, dedicated diet coach"
          },
          "price": "18999",
          "priceCurrency": "INR"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Fat to Fit Plan",
            "description": "1-to-1 diet coach, weekly follow-up, yoga, weight management, craving care"
          },
          "price": "12999",
          "priceCurrency": "INR"
        }
      ]
    }
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What subscription plans does DrX Consult offer?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "DrX Consult offers three plans: Women's Care (from ₹13,999), Chronic Care (from ₹18,999), and Fat to Fit (from ₹12,999). Each plan is available in 3-month, 6-month, and 12-month durations."
        }
      },
      {
        "@type": "Question",
        "name": "Can I consult a doctor online on DrX Consult?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. DrX Consult connects you with certified doctors, pharmacists, and dietitians for online consultations via video call."
        }
      },
      {
        "@type": "Question",
        "name": "Are the professionals on DrX Consult certified?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all doctors, pharmacists, and nutritionists on DrX Consult are licensed professionals with verified credentials."
        }
      },
      {
        "@type": "Question",
        "name": "Is my health information secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. DrX Consult uses secure encryption to protect all patient health information and personal data."
        }
      }
    ]
  }

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow"} />
      <meta name="theme-color" content="#2563eb" />
      <meta name="geo.region" content="IN" />
      <meta name="geo.country" content="India" />

      <link rel="canonical" href={canonical || fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content="DrX Consult" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content="@drxconsult" />

      {/* Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </Head>
  )
}

export default SEO
