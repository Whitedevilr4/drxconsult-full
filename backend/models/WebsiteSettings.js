const mongoose = require('mongoose');

const websiteSettingsSchema = new mongoose.Schema({
  // Website Basic Info
  websiteName: {
    type: String,
    default: 'Patient Counselling Platform',
    required: true
  },
  websiteDescription: {
    type: String,
    default: 'Connect with expert pharmacists for personalized counselling sessions',
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  favicon: {
    type: String,
    default: ''
  },

  // Hero Section
  heroSection: {
    title: {
      type: String,
      default: 'Patient Counselling Platform'
    },
    subtitle: {
      type: String,
      default: 'Your Health, Our Priority'
    },
    description: {
      type: String,
      default: 'Connect with expert pharmacists for personalized counselling sessions'
    },
    backgroundImage: {
      type: String,
      default: ''
    },
    textBackgroundImage: {
      type: String,
      default: ''
    },
    ctaText: {
      type: String,
      default: 'Book Consultation'
    },
    features: [{
      icon: String,
      text: String
    }],
    slides: [{
      title: {
        type: String,
        default: ''
      },
      subtitle: {
        type: String,
        default: ''
      },
      description: {
        type: String,
        default: ''
      },
      icon: {
        type: String,
        default: '🩺'
      },
      slideImage: {
        type: String,
        default: ''
      },
      features: [{
        text: String,
        icon: String
      }],
      quote: {
        type: String,
        default: ''
      },
      isMainSlide: {
        type: Boolean,
        default: false
      },
      order: {
        type: Number,
        default: 0
      }
    }]
  },

  // Professional Tiles Section
  professionalTiles: {
    sectionTitle: {
      type: String,
      default: 'Our Healthcare Professionals'
    },
    sectionDescription: {
      type: String,
      default: 'Connect with certified doctors, pharmacists, and dietitians for comprehensive healthcare guidance'
    },
    tiles: [{
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      buttonText: {
        type: String,
        default: 'Consult Now'
      },
      navigationUrl: {
        type: String,
        required: true
      },
      backgroundImage: {
        type: String,
        default: ''
      },
      gradientFrom: {
        type: String,
        default: 'blue-600'
      },
      gradientTo: {
        type: String,
        default: 'indigo-600'
      },
      icon: {
        type: String,
        default: 'medical'
      },
      order: {
        type: Number,
        default: 0
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }]
  },

  // Contact Information
  contactInfo: {
    email: {
      type: String,
      default: 'info@patientcounselling.com'
    },
    phone: {
      type: String,
      default: '+1 (555) 123-4567'
    },
    address: {
      type: String,
      default: '123 Healthcare Street, Medical City, MC 12345'
    },
    workingHours: {
      type: String,
      default: 'Mon-Fri: 9:00 AM - 6:00 PM'
    }
  },

  // Social Media Links
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
    youtube: String
  },

  // SEO Settings
  seo: {
    metaTitle: {
      type: String,
      default: 'Patient Counselling Platform - Expert Pharmacist Consultations'
    },
    metaDescription: {
      type: String,
      default: 'Book online consultations with certified pharmacists. Get expert advice on medications, health concerns, and personalized treatment plans.'
    },
    keywords: {
      type: String,
      default: 'pharmacist consultation, online pharmacy, medication advice, health counselling'
    }
  },

  // Footer Settings
  footerText: {
    type: String,
    default: 'Providing quality healthcare consultations with certified pharmacists.'
  },

  // Maintenance Mode
  maintenanceMode: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'We are currently performing maintenance. Please check back soon.'
    }
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);
